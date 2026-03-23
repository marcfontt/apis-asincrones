import express from 'express';
import cors from 'cors';
import * as k8s from '@kubernetes/client-node';
import * as http from 'http';
import { randomUUID } from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
const SCENARIO_SERVICE_URL = process.env.SCENARIO_SERVICE_URL || 'http://scenario-service:3000';
const ACR_SERVER = process.env.ACR_SERVER || 'feinaregistry.azurecr.io';
const LOAD_GENERATOR_IMAGE = `${ACR_SERVER}/load-generator:latest`;
const ORCHESTRATOR_NAMESPACE = process.env.NAMESPACE || 'apis-asincronas';

const kc = new k8s.KubeConfig();
let k8sEnabled = false;
let coreApi: k8s.CoreV1Api;
let batchApi: k8s.BatchV1Api;

try {
  kc.loadFromCluster();
  coreApi = kc.makeApiClient(k8s.CoreV1Api);
  batchApi = kc.makeApiClient(k8s.BatchV1Api);
  k8sEnabled = true;
  console.log('[orchestrator] K8s in-cluster auth loaded');
} catch (e) {
  console.warn('[orchestrator] K8s not available, running in mock mode');
}

interface RunRecord {
  id: string;
  scenarioId: string;
  scenarioName: string;
  architecture: string;
  protocol: string;
  platform: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  namespace?: string;
  jobName?: string;
}
const runs = new Map<string, RunRecord>();

function sanitizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 48);
}

function httpJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    }).on('error', reject);
  });
}

function httpPatch(url: string, body: object): Promise<void> {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    try {
      const u = new URL(url);
      const req = http.request(
        {
          hostname: u.hostname,
          port: u.port || 80,
          path: u.pathname + (u.search || ''),
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        },
        (res) => { res.on('data', () => {}); res.on('end', resolve); }
      );
      req.on('error', () => resolve());
      req.write(data);
      req.end();
    } catch { resolve(); }
  });
}

async function updateScenarioStatus(scenarioId: string, status: string, currentRunId?: string | null) {
  try {
    const body: Record<string, unknown> = { status };
    if (currentRunId !== undefined) body.currentRunId = currentRunId;
    await httpPatch(`${SCENARIO_SERVICE_URL}/scenarios/${scenarioId}`, body);
  } catch (e) {
    console.warn(`[orchestrator] updateScenarioStatus failed: ${(e as Error).message}`);
  }
}

async function copyAcrSecret(targetNamespace: string) {
  try {
    const res = await coreApi.readNamespacedSecret('acr-secret', ORCHESTRATOR_NAMESPACE);
    const s = res.body;
    await coreApi.createNamespacedSecret(targetNamespace, {
      apiVersion: 'v1', kind: 'Secret',
      metadata: { name: 'acr-secret', namespace: targetNamespace },
      type: s.type, data: s.data,
    });
    console.log(`[orchestrator] ACR secret copied to ${targetNamespace}`);
  } catch (e) {
    console.warn(`[orchestrator] copyAcrSecret: ${(e as Error).message}`);
  }
}

async function deployScenario(runId: string, scenarioId: string, scenarioName: string) {
  const slug = sanitizeName(scenarioName);
  const shortId = runId.substring(0, 6);
  const namespace = `sc-${slug}-${shortId}`;
  const jobName = `benchmark-${slug}-${shortId}`;

  console.log(`[orchestrator] deploy runId=${runId}  ns=${namespace}  job=${jobName}`);

  let brokerType = 'kafka';
  let architecture = '';
  let protocol = '';
  let platform = '';
  try {
    const sc = await httpJson(`${SCENARIO_SERVICE_URL}/scenarios/${scenarioId}`) as any;
    if (sc) {
      architecture = sc.architecture || sc.type || '';
      protocol = sc.protocol || '';
      platform = sc.platform || '';
      const raw = (sc.broker || sc.protocol || 'kafka').toLowerCase();
      brokerType = raw.includes('mqtt') ? 'mqtt' : 'kafka';
    }
  } catch (e) {
    console.warn(`[orchestrator] Could not fetch scenario: ${(e as Error).message}`);
  }

  const run = runs.get(runId);
  if (run) {
    run.architecture = architecture;
    run.protocol = protocol;
    run.platform = platform;
    run.namespace = namespace;
    run.jobName = jobName;
  }

  if (!k8sEnabled) {
    console.log('[orchestrator] Mock mode - skipping K8s');
    return;
  }

  await coreApi.createNamespace({
    apiVersion: 'v1', kind: 'Namespace',
    metadata: {
      name: namespace,
      labels: { 'managed-by': 'benchmark-orchestrator', 'scenario-id': scenarioId, 'run-id': runId },
    },
  });

  await copyAcrSecret(namespace);

  await batchApi.createNamespacedJob(namespace, {
    apiVersion: 'batch/v1', kind: 'Job',
    metadata: {
      name: jobName, namespace,
      labels: { 'managed-by': 'benchmark-orchestrator', 'run-id': runId, 'scenario-id': scenarioId },
    },
    spec: {
      ttlSecondsAfterFinished: 600,
      backoffLimit: 1,
      template: {
        metadata: { labels: { 'run-id': runId } },
        spec: {
          restartPolicy: 'Never',
          imagePullSecrets: [{ name: 'acr-secret' }],
          containers: [{
            name: 'load-generator',
            image: LOAD_GENERATOR_IMAGE,
            imagePullPolicy: 'Always',
            env: [
              { name: 'SCENARIO_ID',          value: scenarioId },
              { name: 'RUN_ID',               value: runId },
              { name: 'BROKER_TYPE',           value: brokerType },
              { name: 'KAFKA_BROKERS',         value: 'kafka.apis-asincronas.svc.cluster.local:9092' },
              { name: 'MQTT_BROKER',           value: 'mqtt://emqx.apis-asincronas.svc.cluster.local:1883' },
              { name: 'ELASTICSEARCH_URL',     value: 'http://elasticsearch.apis-asincronas.svc.cluster.local:9200' },
              { name: 'METRICS_API_URL',       value: 'http://metrics-api.apis-asincronas.svc.cluster.local:3001' },
              { name: 'TEST_DURATION_SECONDS', value: '60' },
              { name: 'MESSAGES_PER_SECOND',   value: '100' },
              { name: 'MESSAGE_SIZE_BYTES',    value: '256' },
            ],
            resources: {
              requests: { cpu: '100m', memory: '128Mi' },
              limits:   { cpu: '500m', memory: '512Mi' },
            },
          }],
        },
      },
    },
  });
  console.log(`[orchestrator] Job ${jobName} created`);
}

async function monitorJob(runId: string, namespace: string, jobName: string, scenarioId: string) {
  let attempts = 0;
  const maxAttempts = 180;

  const poll = async () => {
    const run = runs.get(runId);
    if (!run || run.status === 'cancelled') return;
    if (++attempts > maxAttempts) {
      run.status = 'failed';
      run.completedAt = new Date().toISOString();
      await updateScenarioStatus(scenarioId, 'idle', null);
      return;
    }
    try {
      const job = (await batchApi.readNamespacedJob(jobName, namespace)).body;
      const succeeded = job.status?.succeeded || 0;
      const failed    = job.status?.failed    || 0;
      const limit     = job.spec?.backoffLimit ?? 1;

      if (succeeded > 0) {
        run.status = 'completed';
        run.completedAt = new Date().toISOString();
        await updateScenarioStatus(scenarioId, 'idle', null);
        try { await coreApi.deleteNamespace(namespace); } catch (_) {}
        console.log(`[orchestrator] Run ${runId} completed`);
      } else if (failed > limit) {
        run.status = 'failed';
        run.completedAt = new Date().toISOString();
        await updateScenarioStatus(scenarioId, 'idle', null);
        console.log(`[orchestrator] Run ${runId} failed`);
      } else {
        setTimeout(poll, 10_000);
      }
    } catch (e) {
      console.warn(`[orchestrator] monitor poll error: ${(e as Error).message}`);
      setTimeout(poll, 10_000);
    }
  };

  setTimeout(poll, 10_000);
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', k8sEnabled, image: LOAD_GENERATOR_IMAGE });
});

app.get('/runs', (_req, res) => {
  const all = Array.from(runs.values())
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  res.json(all);
});

app.get('/runs/active', (_req, res) => {
  const active = Array.from(runs.values()).filter(
    r => r.status === 'running' || r.status === 'pending'
  );
  res.json(active);
});

app.get('/runs/:id', (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Not found' });
  res.json(run);
});

app.post('/runs', async (req, res) => {
  const { scenarioId } = req.body;
  if (!scenarioId) return res.status(400).json({ error: 'scenarioId required' });

  let scenarioName = scenarioId;
  let architecture = '';
  let protocol = '';
  let platform = '';
  try {
    const sc = await httpJson(`${SCENARIO_SERVICE_URL}/scenarios/${scenarioId}`) as any;
    if (sc) {
      scenarioName = sc.name || sc.title || scenarioId;
      architecture = sc.architecture || sc.type || '';
      protocol     = sc.protocol || '';
      platform     = sc.platform || '';
    }
  } catch (_) {}

  const runId = randomUUID();
  const run: RunRecord = {
    id: runId, scenarioId, scenarioName,
    architecture, protocol, platform,
    status: 'pending', startedAt: new Date().toISOString(),
  };
  runs.set(runId, run);

  await updateScenarioStatus(scenarioId, 'running', runId);
  run.status = 'running';

  deployScenario(runId, scenarioId, scenarioName)
    .then(() => {
      const r = runs.get(runId);
      if (r && r.status === 'running' && r.namespace && r.jobName) {
        monitorJob(runId, r.namespace, r.jobName, scenarioId);
      }
    })
    .catch(async (e) => {
      console.error(`[orchestrator] Deploy failed: ${e.message}`);
      const r = runs.get(runId);
      if (r) { r.status = 'failed'; r.completedAt = new Date().toISOString(); }
      await updateScenarioStatus(scenarioId, 'idle', null);
    });

  res.status(201).json({ runId, scenarioId, status: 'running' });
});

app.post('/runs/:id/cancel', async (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Not found' });

  run.status = 'cancelled';
  run.completedAt = new Date().toISOString();
  await updateScenarioStatus(run.scenarioId, 'idle', null);

  if (k8sEnabled && run.namespace) {
    try { await coreApi.deleteNamespace(run.namespace); } catch (_) {}
  }
  res.json({ ok: true });
});

app.delete('/runs/:id', (req, res) => {
  if (!runs.has(req.params.id)) return res.status(404).json({ error: 'Not found' });
  runs.delete(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[orchestrator] port=${PORT}  k8s=${k8sEnabled}  image=${LOAD_GENERATOR_IMAGE}`);
});
