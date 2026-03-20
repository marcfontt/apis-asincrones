import express, { Request, Response } from 'express';
import { Client } from '@elastic/elasticsearch';
import { v4 as uuidv4 } from 'uuid';
import * as k8s from '@kubernetes/client-node';

const app = express();
app.use(express.json());

const es = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200' });
const INDEX = 'async-benchmarks';

const SCENARIO_SERVICE_URL = process.env.SCENARIO_SERVICE_URL || 'http://scenario-service:3002';
const METRICS_API_URL      = process.env.METRICS_API_URL      || 'http://metrics-api:3004';
const OWN_NAMESPACE        = process.env.K8S_NAMESPACE        || 'apis-asincronas';
const LOAD_GENERATOR_IMAGE = process.env.LOAD_GENERATOR_IMAGE || 'feinaregistry.azurecr.io/load-generator:latest';
const KAFKA_BOOTSTRAP      = process.env.KAFKA_BOOTSTRAP      || 'kafka-cluster-kafka-bootstrap.kafka-strimzi.svc:9092';

const kc = new k8s.KubeConfig();
let k8sEnabled = false;
try {
  if (process.env.KUBERNETES_SERVICE_HOST) {
    kc.loadFromCluster();
  } else {
    kc.loadFromDefault();
  }
  k8sEnabled = true;
  console.log('[K8s] Client initialized');
} catch {
  console.warn('[K8s] Not available — ES-only mode');
}

const coreApi  = k8sEnabled ? kc.makeApiClient(k8s.CoreV1Api)  : null;
const batchApi = k8sEnabled ? kc.makeApiClient(k8s.BatchV1Api) : null;

async function updateRun(id: string, patch: Record<string, unknown>) {
  await es.update({ index: INDEX, id, body: { doc: { ...patch, updatedAt: new Date().toISOString() } } });
}

async function copyAcrSecret(targetNamespace: string) {
  if (!coreApi) return;
  try {
    const { body: secret } = await coreApi.readNamespacedSecret('acr-secret', OWN_NAMESPACE);
    await coreApi.createNamespacedSecret(targetNamespace, {
      metadata: { name: 'acr-secret', namespace: targetNamespace },
      type: secret.type,
      data: secret.data,
    });
  } catch (err: any) {
    console.warn('[K8s] Could not copy ACR secret:', err.message);
  }
}

async function deployScenario(runId: string, scenarioId: string): Promise<void> {
  if (!k8sEnabled || !coreApi || !batchApi) {
    await updateRun(runId, { status: 'error', error: 'Kubernetes not available' });
    return;
  }
  const ns      = `scenario-${runId.slice(0, 8)}`;
  const jobName = `load-gen-${runId.slice(0, 8)}`;
  try {
    const scenarioRes = await fetch(`${SCENARIO_SERVICE_URL}/scenarios/${scenarioId}`);
    if (!scenarioRes.ok) throw new Error(`Scenario ${scenarioId} not found`);
    const scenario: any = await scenarioRes.json();

    await coreApi.createNamespace({
      metadata: { name: ns, labels: { 'managed-by': 'benchmark-orchestrator', 'run-id': runId } },
    });
    await copyAcrSecret(ns);

    await batchApi.createNamespacedJob(ns, {
      metadata: { name: jobName, namespace: ns },
      spec: {
        backoffLimit: 0,
        ttlSecondsAfterFinished: 3600,
        template: {
          metadata: { labels: { 'run-id': runId } },
          spec: {
            restartPolicy: 'Never',
            imagePullSecrets: [{ name: 'acr-secret' }],
            containers: [{
              name: 'load-generator',
              image: LOAD_GENERATOR_IMAGE,
              env: [
                { name: 'RUN_ID',          value: runId },
                { name: 'SCENARIO_ID',     value: scenarioId },
                { name: 'PROTOCOL',        value: scenario.protocol     || 'Kafka' },
                { name: 'ARCHITECTURE',    value: scenario.architecture || 'EDA'   },
                { name: 'PLATFORM',        value: scenario.platform     || 'Kafka' },
                { name: 'DURATION',        value: String(scenario.duration    ?? 60)  },
                { name: 'RATE',            value: String(scenario.rate        ?? 100) },
                { name: 'PAYLOAD_SIZE',    value: String(scenario.payloadSize ?? 256) },
                { name: 'METRICS_API_URL', value: METRICS_API_URL },
                { name: 'KAFKA_BOOTSTRAP', value: KAFKA_BOOTSTRAP },
              ],
              resources: { requests: { cpu: '100m', memory: '128Mi' }, limits: { cpu: '500m', memory: '256Mi' } },
            }],
          },
        },
      },
    });

    await updateRun(runId, { status: 'running', namespace: ns, jobName, startedAt: new Date().toISOString() });
    monitorJob(runId, ns, jobName).catch(err => console.error('[Monitor]', err.message));
  } catch (err: any) {
    await updateRun(runId, { status: 'error', error: err.message });
    coreApi.deleteNamespace(ns).catch(() => {});
  }
}

async function monitorJob(runId: string, namespace: string, jobName: string) {
  if (!batchApi) return;
  const MAX = 60 * 60 * 1000;
  const POLL = 10_000;
  const start = Date.now();
  while (Date.now() - start < MAX) {
    await new Promise(r => setTimeout(r, POLL));
    try {
      const { body: job } = await batchApi.readNamespacedJob(jobName, namespace);
      if (job.status?.succeeded) { await updateRun(runId, { status: 'completed', completedAt: new Date().toISOString() }); return; }
      if (job.status?.failed)    { await updateRun(runId, { status: 'error', error: 'Job failed', completedAt: new Date().toISOString() }); return; }
    } catch (err: any) { console.warn('[Monitor]', err.message); }
  }
  await updateRun(runId, { status: 'error', error: 'Timeout' });
}

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'benchmark-orchestrator', k8sEnabled }));

app.get('/runs', async (_req, res) => {
  try {
    const result = await es.search({ index: INDEX, body: { query: { match_all: {} }, size: 100, sort: [{ createdAt: { order: 'desc' } }] } });
    res.json((result.hits?.hits ?? []).map((h: any) => ({ id: h._id, ...h._source })));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get('/runs/:id', async (req, res) => {
  try {
    const r = await es.get({ index: INDEX, id: req.params.id });
    res.json({ id: r._id, ...(r._source as object) });
  } catch (err: any) {
    if (err.meta?.statusCode === 404) res.status(404).json({ error: 'Run not found' });
    else res.status(500).json({ error: err.message });
  }
});

app.post('/runs', async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.body;
    if (!scenarioId) { res.status(400).json({ error: 'scenarioId is required' }); return; }
    const id = uuidv4();
    const body = { scenarioId, status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await es.index({ index: INDEX, id, body });
    res.status(201).json({ id, ...body });
    deployScenario(id, scenarioId).catch(err => console.error('[Post /runs]', err));
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.put('/runs/:id', async (req, res) => {
  try {
    const body = { ...req.body, updatedAt: new Date().toISOString() };
    await es.index({ index: INDEX, id: req.params.id, body });
    res.json({ id: req.params.id, ...body });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.delete('/runs/:id', async (req, res) => {
  try {
    try {
      const existing = await es.get({ index: INDEX, id: req.params.id });
      const runData  = existing._source as any;
      if (runData?.namespace && coreApi) await coreApi.deleteNamespace(runData.namespace).catch(() => {});
    } catch (_) {}
    await es.delete({ index: INDEX, id: req.params.id });
    res.status(204).send();
  } catch (err: any) {
    if (err.meta?.statusCode === 404) res.status(404).json({ error: 'Run not found' });
    else res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`benchmark-orchestrator on port ${PORT} | k8s: ${k8sEnabled}`));
