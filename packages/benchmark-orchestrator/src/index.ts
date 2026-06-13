import express from 'express';
import cors from 'cors';
import * as k8s from '@kubernetes/client-node';
import * as http from 'http';
import { randomUUID } from 'crypto';
import { getMonitorMaxAttempts, isIndefiniteDuration } from './runTiming';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;
const SCENARIO_SERVICE_URL = process.env.SCENARIO_SERVICE_URL || 'http://scenario-service:3002';
const ACR_SERVER = process.env.ACR_SERVER || 'asyncpfgpayg65454.azurecr.io';
const LOAD_GENERATOR_IMAGE = `${ACR_SERVER}/load-generator:latest`;
const LOAD_GENERATOR_CPU = process.env.LOAD_GENERATOR_CPU || '100m';
const LOAD_GENERATOR_NODE_SELECTOR_KEY = process.env.LOAD_GENERATOR_NODE_SELECTOR_KEY || '';
const LOAD_GENERATOR_NODE_SELECTOR_VALUE = process.env.LOAD_GENERATOR_NODE_SELECTOR_VALUE || '';
const MAX_CONCURRENT_RUNS = Math.max(1, Number.parseInt(process.env.MAX_CONCURRENT_RUNS || '1', 10) || 1);
const ORCHESTRATOR_NAMESPACE = process.env.NAMESPACE || 'apis-asincrones';
const BROKER_NAMESPACE = process.env.BROKER_NAMESPACE || 'brokers';
const KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'kafka-cluster-kafka-bootstrap.brokers.svc.cluster.local:9092';
// In the student cluster, "Confluent" is a Kafka-compatible execution path.
// It defaults to the same Strimzi bootstrap service unless a separate
// Confluent-compatible endpoint is explicitly provided.
const CONFLUENT_BROKERS = process.env.CONFLUENT_BROKERS || KAFKA_BROKERS;
// Used by DELETE /runs/:id to cascade-delete the run's metrics from
// Elasticsearch via metrics-api. Without this, deleting a run in the UI
// only drops the orchestrator's in-memory record; the historical mostres
// stay in ES forever and keep polluting the Historial view.
const METRICS_API_URL = process.env.METRICS_API_URL || 'http://metrics-api:3004';
// Use the stable ClusterIP service for benchmark jobs. The headless service can
// return no DNS record while the NATS pod is restarting and has no ready endpoint.
const NATS_BROKER_URL = process.env.NATS_BROKER_URL || 'nats://nats.brokers.svc.cluster.local:4222';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:BenchmarkAdmin2024@rabbitmq.brokers.svc.cluster.local:5672';

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
  'default': { messageSizeBytes: 256, messagesPerSecond: 100, memoryRequest: '256Mi', memoryLimit: '256Mi' },
  'video-4k': { messageSizeBytes: 500_000, messagesPerSecond: 10, memoryRequest: '512Mi', memoryLimit: '512Mi' },
  'video-8k': { messageSizeBytes: 2_000_000, messagesPerSecond: 4, memoryRequest: '768Mi', memoryLimit: '768Mi' },
  'financial': { messageSizeBytes: 512, messagesPerSecond: 200, memoryRequest: '256Mi', memoryLimit: '256Mi' },
  'iot': { messageSizeBytes: 64, messagesPerSecond: 500, memoryRequest: '256Mi', memoryLimit: '256Mi' },
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
  errorCode?: string;
  errorDetail?: string;
  namespace?: string;
  jobName?: string;
  runtimeState?: RunRuntimeState;
}

interface RunRuntimeState {
  jobActive?: number;
  jobSucceeded?: number;
  jobFailed?: number;
  podName?: string;
  podPhase?: string;
  podReady?: boolean;
  nodeName?: string;
  waitingReason?: string;
  waitingMessage?: string;
  terminatedReason?: string;
  scheduleReason?: string;
  scheduleMessage?: string;
}

function brokerServiceCandidates(brokerType: string): string[] {
  switch (brokerType) {
    case 'kafka':
    case 'confluent':
      return ['kafka-cluster-kafka-bootstrap'];
    case 'nats':
      return ['nats', 'nats-headless'];
    case 'rabbitmq':
    case 'amqp':
    case 'mqtt':
      return ['rabbitmq'];
    default:
      return [];
  }
}

async function serviceHasReadyEndpoints(serviceName: string): Promise<boolean> {
  try {
    await coreApi.readNamespacedService(serviceName, BROKER_NAMESPACE);
    const endpoints = (await coreApi.readNamespacedEndpoints(serviceName, BROKER_NAMESPACE)).body;
    return (endpoints.subsets || []).some(subset => (subset.addresses || []).length > 0);
  } catch (_) {
    return false;
  }
}

async function resolveBrokerService(brokerType: string): Promise<string | null> {
  for (const candidate of brokerServiceCandidates(brokerType)) {
    if (await serviceHasReadyEndpoints(candidate)) return candidate;
  }
  return null;
}

async function postRunDiagnosticMetric(run: RunRecord, status: 'failed' | 'running', errorCode?: string, errorDetail?: string) {
  const metric = {
    runId: run.id,
    scenarioId: run.scenarioId,
    architecture: run.architecture,
    protocol: run.protocol,
    broker: getBrokerType(run.protocol, run.platform),
    platform: run.platform,
    dataFormat: run.dataFormat,
    latency: 0,
    p50_latency_ms: 0,
    p95_latency_ms: 0,
    p99_latency_ms: 0,
    throughput: 0,
    throughput_stable: 0,
    errorRate: status === 'failed' ? 1 : 0,
    messages_sent: 0,
    messages_recv: 0,
    messages_sent_stable: 0,
    messages_recv_stable: 0,
    errors: status === 'failed' ? 1 : 0,
    elapsed_s: 0,
    status,
    errorCode,
    errorDetail,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(`${METRICS_API_URL}/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    });
    if (!response.ok) {
      console.warn(`[orchestrator] diagnostic metric returned HTTP ${response.status}`);
    }
  } catch (e) {
    console.warn(`[orchestrator] diagnostic metric failed: ${(e as Error).message}`);
  }
}
const runs = new Map<string, RunRecord>();
const runQueue: string[] = [];

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

function activeRunningCount(): number {
  return Array.from(runs.values()).filter(run => run.status === 'running').length;
}

async function readRunRuntimeState(run: RunRecord): Promise<RunRuntimeState | undefined> {
  if (!k8sEnabled || !run.namespace || !run.jobName || run.status !== 'running') {
    return undefined;
  }

  const runtimeState: RunRuntimeState = {};

  try {
    const job = (await batchApi.readNamespacedJob(run.jobName, run.namespace)).body;
    runtimeState.jobActive = job.status?.active || 0;
    runtimeState.jobSucceeded = job.status?.succeeded || 0;
    runtimeState.jobFailed = job.status?.failed || 0;
  } catch (e) {
    runtimeState.waitingReason = 'JOB_STATUS_UNAVAILABLE';
    runtimeState.waitingMessage = (e as Error).message;
  }

  try {
    const pods = (await coreApi.listNamespacedPod(
      run.namespace,
      undefined,
      undefined,
      undefined,
      undefined,
      `run-id=${run.id}`,
    )).body.items;
    const pod = pods[0];

    if (!pod) {
      runtimeState.podPhase = 'WaitingForPod';
      return runtimeState;
    }

    runtimeState.podName = pod.metadata?.name;
    runtimeState.podPhase = pod.status?.phase;
    runtimeState.nodeName = pod.spec?.nodeName;
    runtimeState.podReady = Boolean(pod.status?.containerStatuses?.some(status => status.ready));

    const containerState = pod.status?.containerStatuses?.[0]?.state;
    if (containerState?.waiting) {
      runtimeState.waitingReason = containerState.waiting.reason;
      runtimeState.waitingMessage = containerState.waiting.message;
    }
    if (containerState?.terminated) {
      runtimeState.terminatedReason = containerState.terminated.reason;
    }

    const scheduledCondition = pod.status?.conditions?.find(condition => condition.type === 'PodScheduled');
    if (scheduledCondition && scheduledCondition.status === 'False') {
      runtimeState.scheduleReason = scheduledCondition.reason;
      runtimeState.scheduleMessage = scheduledCondition.message;
    }
  } catch (e) {
    runtimeState.waitingReason = runtimeState.waitingReason || 'POD_STATUS_UNAVAILABLE';
    runtimeState.waitingMessage = runtimeState.waitingMessage || (e as Error).message;
  }

  return runtimeState;
}

async function enrichRunsWithRuntimeState(records: RunRecord[]): Promise<RunRecord[]> {
  return Promise.all(records.map(async run => ({
    ...run,
    runtimeState: await readRunRuntimeState(run),
  })));
}

function enqueueRun(runId: string): void {
  if (!runQueue.includes(runId)) {
    runQueue.push(runId);
    console.log(`[orchestrator] Run ${runId} queued (${runQueue.length} pending, maxConcurrentRuns=${MAX_CONCURRENT_RUNS})`);
  }
  processRunQueue();
}

function processRunQueue(): void {
  while (activeRunningCount() < MAX_CONCURRENT_RUNS && runQueue.length > 0) {
    const nextRunId = runQueue.shift();
    if (!nextRunId) continue;

    const run = runs.get(nextRunId);
    if (!run || run.status !== 'pending') {
      continue;
    }

    run.status = 'running';
    console.log(`[orchestrator] Run ${nextRunId} starting (${activeRunningCount()}/${MAX_CONCURRENT_RUNS})`);
    void startRun(nextRunId);
  }
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

  const registroEjecucion = runs.get(runId);

  // El broker real surt sobretot de la plataforma triada.
  // Exemple: gRPC sobre Kafka continua connectant contra Kafka.
  const tipoBroker = getBrokerType(registroEjecucion?.protocol || '', registroEjecucion?.platform || '');

  const serveiBrokerPreparat = await resolveBrokerService(tipoBroker);
  if (!serveiBrokerPreparat) {
    const detall = `No hi ha cap endpoint llest per al broker "${tipoBroker}" al namespace "${BROKER_NAMESPACE}". Revisa kubectl get pods,svc,endpoints -n ${BROKER_NAMESPACE}.`;
    if (registroEjecucion) {
      registroEjecucion.status = 'failed';
      registroEjecucion.completedAt = new Date().toISOString();
      registroEjecucion.errorCode = 'BROKER_NOT_READY';
      registroEjecucion.errorDetail = detall;
      await postRunDiagnosticMetric(registroEjecucion, 'failed', 'BROKER_NOT_READY', detall);
    }
    await updateScenarioStatus(scenarioId, 'failed', null);
    throw new Error(detall);
  }
  console.log(`[orchestrator] brokerType=${tipoBroker} service=${serveiBrokerPreparat} ready`);

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

  // Cada format té payload i ràtio per defecte. L'escenari pot sobreescriure
  // aquests valors, però si no ho fa usem la taula DATA_FORMAT_CONFIG.
  const formatoDatos = registroEjecucion?.dataFormat || 'default';
  const configuracionFormato = DATA_FORMAT_CONFIG[formatoDatos] || DATA_FORMAT_CONFIG['default'];

  // `duration=0` és l'únic sentinel d'indefinit. Qualsevol durada positiva
  // és una prova finita i el Job tindrà TTL quan acabi.
  const datosEscenario = registroEjecucion as any;
  const duracionEscenario = datosEscenario?.duration;
  const ratioEscenario = datosEscenario?.rate;
  const tamanoPayloadEscenario = datosEscenario?.payloadSize;
  const esDuracionIndefinida = isIndefiniteDuration(duracionEscenario);
  const duracionEnSegundos = esDuracionIndefinida ? '0' : String(duracionEscenario);
  const mensajesPorSegundo = ratioEscenario != null && ratioEscenario > 0
    ? String(ratioEscenario)
    : String(configuracionFormato.messagesPerSecond);
  const tamanoMensajeBytes = tamanoPayloadEscenario != null && tamanoPayloadEscenario > 0
    ? String(tamanoPayloadEscenario)
    : String(configuracionFormato.messageSizeBytes);

  console.log(`[orchestrator] dataFormat=${formatoDatos}  duration=${duracionEnSegundos}s  rate=${mensajesPorSegundo}msg/s  size=${tamanoMensajeBytes}B  brokerType=${tipoBroker}  indefinite=${esDuracionIndefinida}`);

  const jobSpec: any = {
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
            { name: 'BROKER_TYPE', value: tipoBroker },
            { name: 'ARCHITECTURE', value: registroEjecucion?.architecture || '' },
            { name: 'PROTOCOL', value: registroEjecucion?.protocol || 'Kafka' },
            { name: 'PLATFORM', value: registroEjecucion?.platform || '' },
            { name: 'DATA_FORMAT', value: formatoDatos },
            { name: 'KAFKA_BROKERS', value: tipoBroker === 'confluent' ? CONFLUENT_BROKERS : KAFKA_BROKERS },
            { name: 'NATS_URL', value: NATS_BROKER_URL },
            { name: 'RABBITMQ_URL', value: RABBITMQ_URL },
            { name: 'MQTT_BROKER', value: 'mqtt://emqx.brokers.svc.cluster.local:1883' },
            { name: 'METRICS_API_URL', value: `http://metrics-api.${ORCHESTRATOR_NAMESPACE}.svc.cluster.local:3004` },
            { name: 'TEST_DURATION_SECONDS', value: duracionEnSegundos },
            { name: 'MESSAGES_PER_SECOND', value: mensajesPorSegundo },
            { name: 'MESSAGE_SIZE_BYTES', value: tamanoMensajeBytes },
          ],
          resources: {
            requests: { cpu: LOAD_GENERATOR_CPU, memory: configuracionFormato.memoryRequest },
            limits: { cpu: LOAD_GENERATOR_CPU, memory: configuracionFormato.memoryLimit },
          },
        }],
      },
    },
  };
  if (LOAD_GENERATOR_NODE_SELECTOR_KEY && LOAD_GENERATOR_NODE_SELECTOR_VALUE) {
    jobSpec.template.spec.nodeSelector = {
      [LOAD_GENERATOR_NODE_SELECTOR_KEY]: LOAD_GENERATOR_NODE_SELECTOR_VALUE,
    };
  }
  // Els runs finits tenen marge per tancar connexions i enviar la mostra final.
  if (!esDuracionIndefinida) {
    const duracionNumerica = Number(duracionEscenario);
    const duracionBase = Number.isFinite(duracionNumerica) && duracionNumerica > 0 ? duracionNumerica : 60;
    jobSpec.ttlSecondsAfterFinished = 600;
    jobSpec.activeDeadlineSeconds = Math.max(duracionBase, 60) + 900;
  }

  await batchApi.createNamespacedJob(namespace, {
    apiVersion: 'batch/v1', kind: 'Job',
    metadata: {
      name: jobName, namespace,
      labels: { 'managed-by': 'benchmark-orchestrator', 'run-id': runId, 'scenario-id': scenarioId },
    },
    spec: jobSpec,
  });
  console.log(`[orchestrator] Job ${jobName} created  format=${formatoDatos}  duration=${duracionEnSegundos}s  size=${tamanoMensajeBytes}B  rate=${mensajesPorSegundo}msg/s`);
}

async function monitorJob(
  runId: string,
  namespace: string,
  jobName: string,
  scenarioId: string,
  expectedDurationSeconds?: number | null,
) {
  let attempts = 0;
  const maxAttempts = getMonitorMaxAttempts(expectedDurationSeconds);
  const poll = async () => {
    const run = runs.get(runId);
    if (!run || run.status === 'cancelled') return;
    attempts += 1;
    try {
      const job = (await batchApi.readNamespacedJob(jobName, namespace)).body;
      const succeeded = job.status?.succeeded || 0;
      const failed = job.status?.failed || 0;
      const limit = job.spec?.backoffLimit ?? 1;
      if (succeeded > 0) {
        run.status = 'completed'; run.completedAt = new Date().toISOString();
        await updateScenarioStatus(scenarioId, 'completed', null);
        try { await coreApi.deleteNamespace(namespace); } catch (_) { }
        console.log(`[orchestrator] Run ${runId} completed`);
        processRunQueue();
      } else if (failed > limit) {
        run.status = 'failed'; run.completedAt = new Date().toISOString();
        run.errorCode = 'KUBERNETES_JOB_FAILED';
        run.errorDetail = `El Job ${jobName} ha superat el backoffLimit (${limit}).`;
        await updateScenarioStatus(scenarioId, 'failed', null);
        console.log(`[orchestrator] Run ${runId} failed`);
        processRunQueue();
      } else if (maxAttempts !== null && attempts > maxAttempts) {
        run.status = 'failed'; run.completedAt = new Date().toISOString();
        run.errorCode = 'JOB_MONITOR_TIMEOUT';
        run.errorDetail = `El Job ${jobName} no ha informat d'èxit dins la finestra esperada. Revisa els logs del pod load-generator.`;
        await updateScenarioStatus(scenarioId, 'failed', null);
        console.log(`[orchestrator] Run ${runId} monitor timeout`);
        processRunQueue();
      } else {
        setTimeout(poll, 10_000);
      }
    } catch (e) {
      console.warn(`[orchestrator] poll error: ${(e as Error).message}`);
      if (maxAttempts !== null && attempts > maxAttempts) {
        run.status = 'failed';
        run.completedAt = new Date().toISOString();
        run.errorCode = 'JOB_MONITOR_ERROR';
        run.errorDetail = `No s'ha pogut llegir l'estat del Job ${jobName}: ${(e as Error).message}`;
        await updateScenarioStatus(scenarioId, 'failed', null);
        processRunQueue();
        return;
      }
      setTimeout(poll, 10_000);
    }
  };
  setTimeout(poll, 10_000);
}

async function startRun(runId: string): Promise<void> {
  const run = runs.get(runId) as (RunRecord & { duration?: number | null; rate?: number | null; payloadSize?: number | null }) | undefined;
  if (!run || run.status !== 'running') {
    processRunQueue();
    return;
  }

  try {
    const sc = await httpJson(`${SCENARIO_SERVICE_URL}/scenarios/${run.scenarioId}`);
    if (sc) {
      run.scenarioName = sc.name || sc.title || run.scenarioId;
      run.architecture = run.architecture || sc.architecture || sc.type || '';
      run.protocol = run.protocol || sc.protocol || '';
      run.platform = run.platform || sc.platform || '';
      if (!run.dataFormat || run.dataFormat === 'default') {
        run.dataFormat = sc.dataFormat || run.dataFormat || 'default';
      }
      if (run.duration === undefined) run.duration = sc.duration ?? null;
      if (run.rate === undefined) run.rate = sc.rate ?? null;
      if (run.payloadSize === undefined) run.payloadSize = sc.payloadSize ?? null;
    }
  } catch (_) { }

  await updateScenarioStatus(run.scenarioId, 'running', runId);

  try {
    await deployScenario(runId, run.scenarioId, run.scenarioName);
    const registroDespuesDelDespliegue = runs.get(runId);
    if (registroDespuesDelDespliegue && registroDespuesDelDespliegue.status === 'running' && registroDespuesDelDespliegue.namespace && registroDespuesDelDespliegue.jobName) {
      monitorJob(runId, registroDespuesDelDespliegue.namespace, registroDespuesDelDespliegue.jobName, run.scenarioId, (registroDespuesDelDespliegue as any).duration);
    } else {
      processRunQueue();
    }
  } catch (e) {
    console.error(`[orchestrator] Deploy failed: ${(e as Error).message}`);
    const registroConError = runs.get(runId);
    if (registroConError) {
      registroConError.status = 'failed';
      registroConError.completedAt = new Date().toISOString();
      registroConError.errorCode = registroConError.errorCode || 'DEPLOY_FAILED';
      registroConError.errorDetail = registroConError.errorDetail || (e as Error).message;
    }
    await updateScenarioStatus(run.scenarioId, 'failed', null);
    processRunQueue();
  }
}

// ---------- Routes ----------

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    k8sEnabled,
    image: LOAD_GENERATOR_IMAGE,
    maxConcurrentRuns: MAX_CONCURRENT_RUNS,
    queuedRuns: runQueue.length,
    runningRuns: activeRunningCount(),
  });
});

app.get('/runs', async (_req, res) => {
  const sortedRuns = Array.from(runs.values())
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  res.json(await enrichRunsWithRuntimeState(sortedRuns));
});

app.get('/runs/active', async (_req, res) => {
  const activeRuns = Array.from(runs.values()).filter(r => r.status === 'running' || r.status === 'pending');
  res.json(await enrichRunsWithRuntimeState(activeRuns));
});

app.get('/runs/:id', (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(run);
});

app.post('/runs', async (req, res) => {
  // FIX 1: extreure dataFormat del body (abans s'ignorava completament)
  const { scenarioId, scenarioName: providedName, architecture: providedArchitecture,
          protocol: providedProtocol, platform: providedPlatform, dataFormat: providedDataFormat,
          duration: providedDuration, rate: providedRate, payloadSize: providedPayloadSize } = req.body;
  if (!scenarioId) {
    res.status(400).json({ error: 'scenarioId required' });
    return;
  }

  const shortId = randomUUID().substring(0, 6);
  const baseName = providedName ? sanitizeName(providedName) : '';
  const runId = baseName ? `${baseName}-${shortId}` : randomUUID();

  const run: RunRecord & { duration?: number | null; rate?: number | null; payloadSize?: number | null } = {
    id: runId, scenarioId,
    scenarioName: providedName || scenarioId,
    architecture: providedArchitecture || '',
    protocol: providedProtocol || '',
    platform: providedPlatform || '',
    dataFormat: providedDataFormat || 'default',   // FIX 1: guardat al run
    status: 'pending', startedAt: new Date().toISOString(),
    duration: providedDuration !== undefined ? providedDuration : undefined,
    rate: providedRate !== undefined ? providedRate : undefined,
    payloadSize: providedPayloadSize !== undefined ? providedPayloadSize : undefined,
  };
  runs.set(runId, run);

  // Si la concurrencia esta plena, el run queda a la cua. Escrivim
  // l'estat pendent al scenario-service perque la UI ho pugui explicar.
  await updateScenarioStatus(scenarioId, 'pending', runId);

  res.status(201).json({ id: runId, runId, scenarioId, status: 'pending', queued: true, maxConcurrentRuns: MAX_CONCURRENT_RUNS });
  enqueueRun(runId);
});

app.post('/runs/:id/cancel', async (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  run.status = 'cancelled'; run.completedAt = new Date().toISOString();
  const queuedIndex = runQueue.indexOf(run.id);
  if (queuedIndex >= 0) {
    runQueue.splice(queuedIndex, 1);
  }
  await updateScenarioStatus(run.scenarioId, 'cancelled', null);
  // Respond to the client immediately so the UI doesn't hang on the flush.
  res.json({ ok: true });
  if (k8sEnabled && run.namespace) {
    // Flush window: give the load-generator ~6s to send any in-flight
    // samples to metrics-api before we tear down its namespace. Without
    // this, "Aturar" drops trailing samples and the history count comes
    // out lower than what the live tab showed (user-reported: live shows
    // 1000, history shows ~100).
    const ns = run.namespace;
    setTimeout(async () => {
      try { await coreApi.deleteNamespace(ns); }
      catch (e) { console.warn(`[orchestrator] delayed deleteNamespace failed: ${(e as Error).message}`); }
      processRunQueue();
    }, 6000);
  } else {
    processRunQueue();
  }
});

// POST /runs/reset — Nuke all runs (in-memory) and cascade-wipe ES mostres.
// Used by the "Reinicia tot" UI button to return Historial to zero in one
// action. Active runs are cancelled first (k8s namespaces torn down), then
// the in-memory map is cleared and metrics-api is asked to drop every doc
// in async-metrics. NOT idempotent-safe against in-flight starts: the UI
// disables the button while calling to avoid races.
app.post('/runs/reset', async (_req, res) => {
  const activeNamespaces: string[] = [];
  for (const run of runs.values()) {
    if ((run.status === 'running' || run.status === 'pending') && run.namespace) {
      activeNamespaces.push(run.namespace);
    }
  }
  runs.clear();
  runQueue.length = 0;
  // Fire-and-forget namespace teardown for any active runs. We don't await
  // the delete because the UI already got its synchronous "reset done" ack.
  if (k8sEnabled) {
    for (const ns of activeNamespaces) {
      coreApi.deleteNamespace(ns).catch(e =>
        console.warn(`[orchestrator] reset: deleteNamespace(${ns}) failed: ${(e as Error).message}`)
      );
    }
  }
  let deleted = 0;
  try {
    const respuestaBorradoMetricas = await fetch(`${METRICS_API_URL}/metrics/all`, { method: 'DELETE' });
    if (respuestaBorradoMetricas.ok) {
      const cuerpoRespuesta = await respuestaBorradoMetricas.json().catch(() => ({}));
      deleted = cuerpoRespuesta.deleted ?? 0;
    } else {
      console.warn(`[orchestrator] reset: metrics /all returned ${respuestaBorradoMetricas.status}`);
    }
  } catch (e) {
    console.warn(`[orchestrator] reset: metrics wipe failed: ${(e as Error).message}`);
  }
  return res.json({ ok: true, runsCleared: true, metricsDeleted: deleted, namespacesTornDown: activeNamespaces.length });
});

app.delete('/runs/:id', async (req, res) => {
  const id = req.params.id;
  const hadInMemory = runs.has(id);
  runs.delete(id);
  // Cascade: drop every metric snapshot tied to this runId from ES via
  // metrics-api. Without this, the orchestrator's in-memory row disappears
  // but the mostres stay in ES forever and keep polluting Historial.
  try {
    const respuestaBorradoMetricas = await fetch(`${METRICS_API_URL}/metrics/run/${id}`, { method: 'DELETE' });
    if (!respuestaBorradoMetricas.ok && respuestaBorradoMetricas.status !== 404) {
      console.warn(`[orchestrator] cascade-delete metrics for ${id} returned ${respuestaBorradoMetricas.status}`);
    }
  } catch (e) {
    console.warn(`[orchestrator] cascade-delete metrics for ${id} failed: ${(e as Error).message}`);
  }
  if (!hadInMemory) return res.status(404).json({ error: 'Not found in orchestrator (metrics wiped if any)' });
  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[orchestrator] port=${PORT}  k8s=${k8sEnabled}  image=${LOAD_GENERATOR_IMAGE}  maxConcurrentRuns=${MAX_CONCURRENT_RUNS}`);
});
