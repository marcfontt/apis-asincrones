import express from 'express';
import cors from 'cors';
import * as k8s from '@kubernetes/client-node';
import * as http from 'http';
import { randomUUID } from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
const SCENARIO_SERVICE_URL = process.env.SCENARIO_SERVICE_URL || 'http://scenario-service:3002';
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

// ── FIX 2: Configuració per format de dades ────────────────────────────────
// Cada format defineix la mida del payload i els missatges per segon.
// Això garanteix que cada format executa un benchmark realment diferent.
const DATA_FORMAT_CONFIG: Record<string, {
  messageSizeBytes: number;
  messagesPerSecond: number;
  memoryRequest: string;
  memoryLimit: string;
}> = {
  'default': { messageSizeBytes: 256, messagesPerSecond: 100, memoryRequest: '128Mi', memoryLimit: '512Mi' },
  'video-4k': { messageSizeBytes: 500_000, messagesPerSecond: 10, memoryRequest: '256Mi', memoryLimit: '1Gi' },
  'video-8k': { messageSizeBytes: 2_000_000, messagesPerSecond: 4, memoryRequest: '512Mi', memoryLimit: '2Gi' },
  'financial': { messageSizeBytes: 512, messagesPerSecond: 200, memoryRequest: '128Mi', memoryLimit: '512Mi' },
  'iot': { messageSizeBytes: 64, messagesPerSecond: 500, memoryRequest: '128Mi', memoryLimit: '512Mi' },
};

// ── FIX 3: Mapeig de protocol/plataforma → brokerType ──────────────────────
// La PLATAFORMA indica quin broker real connectar. El PROTOCOL és el wire-protocol
// però no determina el broker (ex: gRPC sobre Kafka segueix sent Kafka).
function getBrokerType(protocol: string, platform: string): string {
  const p = (protocol || '').toLowerCase();
  const pl = (platform || '').toLowerCase();

  // 1. Plataforma té prioritat: indica el broker real
  if (pl.includes('confluent')) return 'confluent';
  if (pl.includes('nats')) return 'nats';
  if (pl.includes('rabbit')) return 'rabbitmq';
  if (pl.includes('kafka')) return 'kafka';

  // 2. Fallback al protocol si no hi ha plataforma clara
  if (p.includes('mqtt')) return 'mqtt';
  if (p.includes('nats')) return 'nats';
  if (p.includes('amqp')) return 'rabbitmq';
  if (p.includes('kafka')) return 'kafka';

  return 'kafka';
}

// ── FIX 1: dataFormat afegit a RunRecord ──────────────────────────────────
interface RunRecord {
  id: string;
  scenarioId: string;
  scenarioName: string;
  architecture: string;
  protocol: string;
  platform: string;
  dataFormat: string;   // <-- AFEGIT: abans no existia
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
  return new Promise((resolve) => {
    try {
      const req = http.get(url, (res) => {
        let data = '';
        res.on('data', (d) => (data += d));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(5000, () => { req.destroy(); resolve(null); });
    } catch { resolve(null); }
  });
}

function httpPatch(url: string, body: object): Promise<void> {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    try {
      const u = new URL(url);
      const req = http.request({
        hostname: u.hostname,
        port: u.port || 80,
        path: u.pathname + (u.search || ''),
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        timeout: 5000,
      }, (res) => { res.on('data', () => { }); res.on('end', resolve); });
      req.on('error', () => resolve());
      req.on('timeout', () => { req.destroy(); resolve(); });
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
  const shortId = runId.slice(-6);
  const namespace = `sc-${slug}-${shortId}`;
  const jobName = `benchmark-${slug}-${shortId}`;

  console.log(`[orchestrator] deploy runId=${runId}  ns=${namespace}  job=${jobName}`);

  const run = runs.get(runId);
  if (run) { run.namespace = namespace; run.jobName = jobName; }

  if (!k8sEnabled) {
    console.log('[orchestrator] Mock mode - skipping K8s');
    return;
  }

  try {
    await coreApi.createNamespace({
      apiVersion: 'v1', kind: 'Namespace',
      metadata: {
        name: namespace,
        labels: { 'managed-by': 'benchmark-orchestrator', 'scenario-id': scenarioId, 'run-id': runId },
      },
    });
  } catch (e: any) {
    if (e?.response?.statusCode === 409 || e?.statusCode === 409) {
      console.log(`[orchestrator] Namespace ${namespace} already exists, cleaning up...`);
      try {
        await coreApi.deleteNamespace(namespace);
        await new Promise(r => setTimeout(r, 5000));
        await coreApi.createNamespace({
          apiVersion: 'v1', kind: 'Namespace',
          metadata: {
            name: namespace,
            labels: { 'managed-by': 'benchmark-orchestrator', 'scenario-id': scenarioId, 'run-id': runId },
          },
        });
      } catch (e2: any) {
        console.error(`[orchestrator] Failed to recreate namespace: ${(e2 as Error).message}`);
        throw e2;
      }
    } else {
      throw e;
    }
  }

  await copyAcrSecret(namespace);

  const r = runs.get(runId);

  // FIX 3: brokerType correcte per tots els protocols
  const brokerType = getBrokerType(r?.protocol || '', r?.platform || '');

  // FIX 2: configuració dinàmica per dataFormat
  const fmt = r?.dataFormat || 'default';
  const fmtConfig = DATA_FORMAT_CONFIG[fmt] || DATA_FORMAT_CONFIG['default'];

  console.log(`[orchestrator] dataFormat=${fmt}  messageSizeBytes=${fmtConfig.messageSizeBytes}  brokerType=${brokerType}`);

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
              { name: 'SCENARIO_ID', value: scenarioId },
              { name: 'RUN_ID', value: runId },
              { name: 'BROKER_TYPE', value: brokerType },                                   // FIX 3
              { name: 'ARCHITECTURE', value: r?.architecture || '' },
              { name: 'PROTOCOL', value: r?.protocol || 'Kafka' },
              { name: 'PLATFORM', value: r?.platform || '' },
              { name: 'DATA_FORMAT', value: fmt },                                          // FIX 1+2: nou
              { name: 'KAFKA_BROKERS', value: brokerType === 'confluent'
                ? 'redpanda.brokers.svc.cluster.local:9093'
                : 'kafka-cluster-kafka-bootstrap.kafka-strimzi.svc.cluster.local:9092' },
              { name: 'NATS_URL', value: 'nats://nats.brokers.svc.cluster.local:4222' },
              { name: 'RABBITMQ_URL', value: 'amqp://admin:BenchmarkAdmin2024@rabbitmq.brokers.svc.cluster.local:5672' },
              { name: 'MQTT_BROKER', value: 'mqtt://emqx.brokers.svc.cluster.local:1883' },
              { name: 'METRICS_API_URL', value: `http://metrics-api.${ORCHESTRATOR_NAMESPACE}.svc.cluster.local:3001` },
              { name: 'TEST_DURATION_SECONDS', value: '60' },
              { name: 'MESSAGES_PER_SECOND', value: String(fmtConfig.messagesPerSecond) },          // FIX 2: dinàmic
              { name: 'MESSAGE_SIZE_BYTES', value: String(fmtConfig.messageSizeBytes) },           // FIX 2: dinàmic
            ],
            resources: {
              requests: { cpu: '100m', memory: fmtConfig.memoryRequest },  // FIX 2: ajustat per format
              limits: { cpu: '500m', memory: fmtConfig.memoryLimit },  // FIX 2: ajustat per format
            },
          }],
        },
      },
    },
  });
  console.log(`[orchestrator] Job ${jobName} created  format=${fmt}  size=${fmtConfig.messageSizeBytes}B  rate=${fmtConfig.messagesPerSecond}msg/s`);
}

async function monitorJob(runId: string, namespace: string, jobName: string, scenarioId: string) {
  let attempts = 0;
  const poll = async () => {
    const run = runs.get(runId);
    if (!run || run.status === 'cancelled') return;
    if (++attempts > 180) {
      run.status = 'failed'; run.completedAt = new Date().toISOString();
      await updateScenarioStatus(scenarioId, 'idle', null); return;
    }
    try {
      const job = (await batchApi.readNamespacedJob(jobName, namespace)).body;
      const succeeded = job.status?.succeeded || 0;
      const failed = job.status?.failed || 0;
      const limit = job.spec?.backoffLimit ?? 1;
      if (succeeded > 0) {
        run.status = 'completed'; run.completedAt = new Date().toISOString();
        await updateScenarioStatus(scenarioId, 'idle', null);
        try { await coreApi.deleteNamespace(namespace); } catch (_) { }
        console.log(`[orchestrator] Run ${runId} completed`);
      } else if (failed > limit) {
        run.status = 'failed'; run.completedAt = new Date().toISOString();
        await updateScenarioStatus(scenarioId, 'idle', null);
        console.log(`[orchestrator] Run ${runId} failed`);
      } else {
        setTimeout(poll, 10_000);
      }
    } catch (e) {
      console.warn(`[orchestrator] poll error: ${(e as Error).message}`);
      setTimeout(poll, 10_000);
    }
  };
  setTimeout(poll, 10_000);
}

// ---------- Routes ----------

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', k8sEnabled, image: LOAD_GENERATOR_IMAGE });
});

app.get('/runs', (_req, res) => {
  res.json(Array.from(runs.values())
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()));
});

app.get('/runs/active', (_req, res) => {
  res.json(Array.from(runs.values()).filter(r => r.status === 'running' || r.status === 'pending'));
});

app.get('/runs/:id', (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(run);
});

app.post('/runs', (req, res) => {
  // FIX 1: extreure dataFormat del body (abans s'ignorava completament)
  const { scenarioId, scenarioName: providedName, dataFormat: providedDataFormat } = req.body;
  if (!scenarioId) {
    res.status(400).json({ error: 'scenarioId required' });
    return;
  }

  const shortId = randomUUID().substring(0, 6);
  const baseName = providedName ? sanitizeName(providedName) : '';
  const runId = baseName ? `${baseName}-${shortId}` : randomUUID();

  const run: RunRecord = {
    id: runId, scenarioId,
    scenarioName: providedName || scenarioId,
    architecture: '', protocol: '', platform: '',
    dataFormat: providedDataFormat || 'default',   // FIX 1: guardat al run
    status: 'running', startedAt: new Date().toISOString(),
  };
  runs.set(runId, run);

  res.status(201).json({ id: runId, runId, scenarioId, status: 'running' });

  setImmediate(async () => {
    try {
      const sc = await httpJson(`${SCENARIO_SERVICE_URL}/scenarios/${scenarioId}`);
      if (sc) {
        run.scenarioName = sc.name || sc.title || scenarioId;
        run.architecture = sc.architecture || sc.type || '';
        run.protocol = sc.protocol || '';
        run.platform = sc.platform || '';
        // FIX 1: si el body no tenia dataFormat, l'agafem del scenario-service
        if (!providedDataFormat && sc.dataFormat) {
          run.dataFormat = sc.dataFormat;
        }
      }
    } catch (_) { }

    await updateScenarioStatus(scenarioId, 'running', runId);

    try {
      await deployScenario(runId, scenarioId, run.scenarioName);
      const r = runs.get(runId);
      if (r && r.status === 'running' && r.namespace && r.jobName) {
        monitorJob(runId, r.namespace, r.jobName, scenarioId);
      }
    } catch (e) {
      console.error(`[orchestrator] Deploy failed: ${(e as Error).message}`);
      const r = runs.get(runId);
      if (r) { r.status = 'failed'; r.completedAt = new Date().toISOString(); }
      await updateScenarioStatus(scenarioId, 'idle', null);
    }
  });
});

app.post('/runs/:id/cancel', async (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  run.status = 'cancelled'; run.completedAt = new Date().toISOString();
  await updateScenarioStatus(run.scenarioId, 'idle', null);
  if (k8sEnabled && run.namespace) {
    try { await coreApi.deleteNamespace(run.namespace); } catch (_) { }
  }
  res.json({ ok: true });
});

app.delete('/runs/:id', (req, res) => {
  if (!runs.has(req.params.id)) return res.status(404).json({ error: 'Not found' });
  runs.delete(req.params.id);
  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[orchestrator] port=${PORT}  k8s=${k8sEnabled}  image=${LOAD_GENERATOR_IMAGE}`);
});