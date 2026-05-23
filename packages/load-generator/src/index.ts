import { Kafka, Partitioners, logLevel } from 'kafkajs';
import { connect as natsConnect, StringCodec } from 'nats';
import * as amqp from 'amqplib';
import * as http from 'http';
import { performance } from 'perf_hooks';
import { retryKafkaStartupStep, waitForKafkaTopicReady } from './kafkaInit';
import { getNatsPayloadPreflightError } from './natsPreflight';

// Contracte de comparacio justa per Kafka, Confluent, NATS i RabbitMQ.
// Tots els runners han de seguir aquestes regles perque el resultat depengui
// del broker/protocol i no d'una configuracio mes favorable per a un d'ells.
//
// Productor: fire-and-forget, sense confirmacio forta del broker.
// Consumidor: una subscripcio, sense ACK artificial per missatge.
// Emmagatzematge: efimer, sense persistencia llarga ni replicacio extra.
// Topologia: 1 productor + 1 consumidor dins del mateix proces.
//
// Si afegim un broker nou, ha de seguir aquest contracte abans d'entrar
// al benchmark principal.

// Configuracio
// Configuració principal del generador. Mantinc els noms dels camps semblants
// a les variables d'entorn, però el contenidor global té un nom explícit per
// evitar abreviatures com "CFG".
const CONFIGURACION = {
  scenarioId: process.env.SCENARIO_ID || 'unknown',
  runId: process.env.RUN_ID || 'unknown',
  brokerType: (process.env.BROKER_TYPE || 'kafka').toLowerCase(),
  architecture: process.env.ARCHITECTURE || '',
  protocol: process.env.PROTOCOL || 'Kafka',
  platform: process.env.PLATFORM || '',
  dataFormat: process.env.DATA_FORMAT || 'default',   // BUG 2: ara es llegeix
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'kafka-cluster-kafka-bootstrap.brokers.svc.cluster.local:9092').split(','),
  mqttBroker: process.env.MQTT_BROKER || 'mqtt://emqx.brokers.svc.cluster.local:1883',
  metricsApiUrl: process.env.METRICS_API_URL || 'http://metrics-api.apis-asincrones.svc.cluster.local:3004',
  durationSeconds: parseInt(process.env.TEST_DURATION_SECONDS || '60'),
  get durationMs() { return this.durationSeconds * 1000; },
  get isIndefinite() { return this.durationSeconds === 0; },
  mensajesPorSegundo: parseInt(process.env.MESSAGES_PER_SECOND || '100'),
  tamanoMensajeBytes: parseInt(process.env.MESSAGE_SIZE_BYTES || '256'),
  // Warm-up seconds: first N seconds of latency samples are discarded to avoid
  // polluting the measurement with TCP handshake, consumer-group join, JIT
  // warm-up, and buffer initialisation. Standard practice in k6, wrk, YCSB.
  warmupSeconds: parseInt(process.env.WARMUP_SECONDS || '5'),
};

let sent = 0, received = 0, errors = 0;
// Post-warmup counters, used for stable-state throughput calculation.
let mensajesEnviadosEstables = 0, mensajesRecibidosEstables = 0;
const latencies: number[] = [];
const startTime = Date.now();
let running = true;
let terminalMetricPosted = false;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRecoverableBrokerStartupError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return [
    'enotfound',
    'econnrefused',
    'econnreset',
    'etimedout',
    'timeout',
    'socket closed',
    'connection closed',
    'connection ended',
  ].some(fragment => message.includes(fragment));
}

async function retryBrokerStartupStep<T>(
  operation: () => Promise<T>,
  options: { retries?: number; delayMs?: number; stepName?: string } = {},
): Promise<T> {
  const retries = options.retries ?? 8;
  const delayMs = options.delayMs ?? 1000;
  const stepName = options.stepName || 'broker startup';

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRecoverableBrokerStartupError(error) || attempt === retries) {
        throw error;
      }
      log(`${stepName} retry ${attempt}/${retries - 1}: ${error instanceof Error ? error.message : String(error)}`);
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`${stepName} failed after ${retries} attempts`);
}

// True after warm-up window has elapsed; from this point latency samples count.
function isStableWindow(): boolean {
  return (Date.now() - startTime) / 1000 >= CONFIGURACION.warmupSeconds;
}

// Model de lliurament del broker actual. Es una propietat del protocol,
// no un truc del benchmark. Es guarda a cada mesura per poder filtrar
// o agrupar els resultats entre pull i push.
function deliveryModel(): 'pull' | 'push' {
  const t = CONFIGURACION.brokerType;
  if (t === 'kafka' || t === 'confluent') return 'pull';
  return 'push'; // nats, rabbitmq, mqtt, amqp
}

// Aturada ordenada: Kubernetes envia SIGTERM abans de SIGKILL.
async function gracefulShutdown() {
  if (!running) return;
  running = false;
  // Esperem 2 segons per deixar acabar enviaments i recepcions pendents.
  await new Promise(r => setTimeout(r, 2000));
  const final = { ...snapshot(true), status: 'cancelled' };
  log(`=== SIGTERM: sent=${final.messages_sent} recv=${final.messages_recv} lat=${final.latency}ms ===`);
  await postTerminalMetric(final);
}

process.on('SIGTERM', async () => {
  await gracefulShutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await gracefulShutdown();
  process.exit(0);
});

const log = (msg: string) => console.log(`[${new Date().toISOString()}] ${msg}`);

// Latencia sub-ms amb performance.now().
// Date.now() te precisio d'1ms, massa poc per brokers rapids.
// performance.now() te precisio alta i es coherent dins del mateix proces.
// Productor i consumidor estan al mateix pod; per aixo es pot usar directament.
function nowMs(): number {
  return performance.now(); // float en ms amb decimals (ex: 0.423)
}

// Genera un número estable entre 0 i 1 a partir del run i del missatge.
// Això substitueix Math.random(): si repetim el mateix runId i seqüència,
// el payload surt igual i el benchmark és més fàcil de defensar al TFG.
function crearNumeroDeterminista(numeroMensaje: number, valorSeparador: number): number {
  const semillaTexto = `${CONFIGURACION.runId}:${numeroMensaje}:${valorSeparador}`;
  let hashNumerico = 2166136261;
  for (let posicion = 0; posicion < semillaTexto.length; posicion += 1) {
    hashNumerico ^= semillaTexto.charCodeAt(posicion);
    hashNumerico = Math.imul(hashNumerico, 16777619);
  }
  return (hashNumerico >>> 0) / 0xffffffff;
}

// Payload semantic per format de dades.
function buildPayload(ts: number, seq: number): string {
  switch (CONFIGURACION.dataFormat) {
    case 'financial':
      // JSON compacte de transaccio financera (~200-400 bytes)
      return JSON.stringify({
        ts, seq,
        txId: `TX-${CONFIGURACION.runId.slice(0, 8)}-${seq}`,
        amount: Math.round(crearNumeroDeterminista(seq, 11) * 100000) / 100,
        currency: 'EUR',
        from: `ACC${String(seq % 1000).padStart(6, '0')}`,
        to: `ACC${String((seq + 1) % 1000).padStart(6, '0')}`,
        type: seq % 3 === 0 ? 'TRANSFER' : seq % 3 === 1 ? 'PAYMENT' : 'REFUND',
        status: 'PENDING',
      });
    case 'iot':
      // Telemetria IoT minima (~100-150 bytes)
      return JSON.stringify({
        ts, seq,
        sensor: `S${seq % 100}`,
        temp: Math.round(crearNumeroDeterminista(seq, 21) * 4000) / 100,
        hum: Math.round(crearNumeroDeterminista(seq, 22) * 10000) / 100,
        bat: Math.round(crearNumeroDeterminista(seq, 23) * 100),
        loc: `Z${seq % 10}`,
      });
    default:
      // video-4k, video-8k, default: padding per simular la mida configurada
      const pad = Math.max(0, CONFIGURACION.tamanoMensajeBytes - 60);
      return JSON.stringify({ ts, seq, runId: CONFIGURACION.runId, d: 'x'.repeat(pad) });
  }
}

// Metriques
// Latency array contains ONLY post-warmup samples (see isStableWindow()).
// Throughput is reported both for the full window (back-compat) and for the
// stable window (recommended for analysis).
function snapshot(final = false) {
  const elapsed = (Date.now() - startTime) / 1000 || 1;
  const stableElapsed = Math.max(0.001, elapsed - CONFIGURACION.warmupSeconds);
  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
  const p50 = sorted.length ? sorted[Math.floor(sorted.length * 0.50)] : 0;
  const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
  const p99 = sorted.length ? sorted[Math.floor(sorted.length * 0.99)] : 0;
  return {
    runId: CONFIGURACION.runId,
    scenarioId: CONFIGURACION.scenarioId,
    architecture: CONFIGURACION.architecture,
    protocol: CONFIGURACION.protocol,
    broker: CONFIGURACION.brokerType,
    platform: CONFIGURACION.platform,
    dataFormat: CONFIGURACION.dataFormat,
    // Fair-comparison metadata: reproducibility + transparency.
    deliveryModel: deliveryModel(),              // 'pull' (kafka/confluent) | 'push' (nats/rmq)
    warmupSeconds: CONFIGURACION.warmupSeconds,            // samples before this are discarded
    maxFetchWaitMs: (CONFIGURACION.brokerType === 'kafka' || CONFIGURACION.brokerType === 'confluent') ? 1 : 0,
    // Latency (averaged over post-warmup samples only).
    latency: Math.round(avg * 1000) / 1000,
    p50_latency_ms: Math.round(p50 * 1000) / 1000,
    p95_latency_ms: Math.round(p95 * 1000) / 1000,
    p99_latency_ms: Math.round(p99 * 1000) / 1000,
    // Throughput: full-window (legacy) + stable-window (post-warmup, use this one).
    throughput: Math.round((received / elapsed) * 100) / 100,
    throughput_stable: Math.round((mensajesRecibidosEstables / stableElapsed) * 100) / 100,
    errorRate: sent > 0 ? Math.round((errors / sent) * 10000) / 10000 : 0,
    messages_sent: sent,
    messages_recv: received,
    messages_sent_stable: mensajesEnviadosEstables,
    messages_recv_stable: mensajesRecibidosEstables,
    errors,
    elapsed_s: Math.round(elapsed),
    timestamp: new Date().toISOString(),
    ...(final ? { status: 'completed' } : {}),
  };
}

function postMetric(doc: object): Promise<void> {
  return new Promise((resolve) => {
    const body = JSON.stringify(doc);
    try {
      const u = new URL(`${CONFIGURACION.metricsApiUrl}/metrics`);
      const req = http.request({
        hostname: u.hostname,
        port: parseInt(u.port || '3004'),
        path: u.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 5000,
      }, (res) => {
        let responseBody = '';
        res.on('data', chunk => { responseBody += chunk; });
        res.on('end', () => {
          if ((res.statusCode || 0) >= 300) {
            log(`WARN metrics-api POST failed with HTTP ${res.statusCode}: ${responseBody.slice(0, 300)}`);
          }
          resolve();
        });
      });
      req.on('error', err => {
        log(`WARN metrics-api POST error: ${err.message}`);
        resolve();
      });
      req.on('timeout', () => {
        log(`WARN metrics-api POST timeout after 5000ms`);
        req.destroy();
        resolve();
      });
      req.write(body); req.end();
    } catch (err) {
      log(`WARN metrics-api POST setup failed: ${(err as Error).message}`);
      resolve();
    }
  });
}

async function postTerminalMetric(doc: object): Promise<void> {
  terminalMetricPosted = true;
  await postMetric(doc);
}

function errorCodeFromBrokerFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lowerMessage = message.toLowerCase();

  if (CONFIGURACION.brokerType === 'nats') {
    if (lowerMessage.includes('max_payload') || lowerMessage.includes('max payload')) {
      return 'NATS_MAX_PAYLOAD_EXCEEDED';
    }
    if (lowerMessage.includes('timeout')) {
      return 'NATS_CONNECT_TIMEOUT';
    }
    return 'NATS_CONNECT_FAILED';
  }

  return 'BROKER_RUN_FAILED';
}

async function prepareKafkaTopic(admin: any, topic: string): Promise<void> {
  await admin.connect();
  await retryKafkaStartupStep(async () => {
    await admin.createTopics({
      topics: [{
        topic, numPartitions: 1, replicationFactor: 1,
        configEntries: [
          { name: 'retention.ms', value: '3600000' },
          { name: 'max.message.bytes', value: '4194304' },
        ],
      }],
      waitForLeaders: true,
    });

    await waitForKafkaTopicReady(
      () => admin.fetchTopicMetadata({ topics: [topic] }),
      { topic, retries: 12, delayMs: 250 },
    );
  }, {
    retries: 4,
    delayMs: 500,
    stepName: `topic setup for ${topic}`,
  });
  await admin.disconnect();
}

async function startKafkaConsumer(consumer: any, topic: string): Promise<void> {
  await retryKafkaStartupStep(async () => {
    let connected = false;
    try {
      await consumer.connect();
      connected = true;
      await consumer.subscribe({ topic, fromBeginning: false });
      await consumer.run({
        autoCommit: false,
        eachMessage: async ({ message }: { message: { value?: Buffer | null } }) => {
          if (!running) return;

          let isProbe = false;
          if (message.value) {
            try {
              const p = JSON.parse(message.value.toString());
              isProbe = Boolean(p.probe);
              if (!isProbe) {
                const lat = nowMs() - p.ts;
                if (lat >= 0 && lat < 120000 && isStableWindow()) {
                  latencies.push(lat);
                  mensajesRecibidosEstables++;
                }
              }
            } catch (_) { }
          }

          if (!isProbe) {
            received++;
          }
        },
      });
    } catch (error) {
      if (connected) {
        try { await consumer.disconnect(); } catch (_) { }
      }
      throw error;
    }
  }, {
    retries: 4,
    delayMs: 500,
    stepName: `consumer startup for ${topic}`,
  });
}

async function warmKafkaProducer(producer: any, topic: string, probePayload: string): Promise<void> {
  await retryKafkaStartupStep(async () => {
    let connected = false;
    try {
      await producer.connect();
      connected = true;
      await producer.send({ topic, messages: [{ value: probePayload }], acks: 0 });
    } catch (error) {
      if (connected) {
        try { await producer.disconnect(); } catch (_) { }
      }
      throw error;
    }
  }, {
    retries: 4,
    delayMs: 500,
    stepName: `producer warm-up for ${topic}`,
  });
}

// Runner: Kafka
async function runKafka() {
  const topic = `benchmark-${CONFIGURACION.runId}`;
  const probePayload = JSON.stringify({ probe: true, ts: nowMs() });
  log(`=== Load Generator (Kafka) ===`);
  log(`Format: ${CONFIGURACION.dataFormat}  |  MsgSize: ${CONFIGURACION.tamanoMensajeBytes}B  |  Rate: ${CONFIGURACION.mensajesPorSegundo} msg/s`);

  const kafka = new Kafka({
    clientId: `load-gen-${CONFIGURACION.runId}`,
    brokers: CONFIGURACION.kafkaBrokers,
    logLevel: logLevel.WARN,
    connectionTimeout: 15000,
    retry: { retries: 8, initialRetryTime: 1000 },
  });

  const admin = kafka.admin();
  // Parity config (see FAIR-COMPARISON CONTRACT at top of file).
  //   Producer: acks=0, no idempotence, no transaction -> matches NATS/RabbitMQ
  //             fire-and-forget semantics.
  //   Consumer: tiny fetch wait (maxWaitTimeInMs=1) -> kafkajs default is 5000
  //             which artificially inflates Kafka latency at low rates. At 1ms
  //             the pull loop is essentially continuous and the artefact is
  //             reduced to statistical noise (<0.5ms avg) while still using
  //             long-polling (no CPU-pinned busy loop).
  //             autoCommit=false -> no periodic offset-commit round-trips,
  //             symmetric with NATS/RabbitMQ which have no offset concept.
  const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
    idempotent: false,
    transactionalId: undefined,
  });
  const consumer = kafka.consumer({
    groupId: `bench-${CONFIGURACION.runId}`,
    sessionTimeout: 10000,
    heartbeatInterval: 3000,
    maxWaitTimeInMs: 1,
    minBytes: 1,
  });

  await prepareKafkaTopic(admin, topic);
  log(`Topic ${topic} created and stabilized`);

  await startKafkaConsumer(consumer, topic);

  await warmKafkaProducer(producer, topic, probePayload);
  log(`Producer + consumer connected. Starting test (warm-up: ${CONFIGURACION.warmupSeconds}s)...`);

  const intervalMs = Math.max(1, Math.round(1000 / CONFIGURACION.mensajesPorSegundo));

  const produceTimer = setInterval(() => {
    if (!running) return;
    try {
      const payload = buildPayload(nowMs(), sent);          // Payload semantic pel format triat.
      // Fire-and-forget with acks=0 to match NATS/RabbitMQ semantics.
      // Without this, Kafka blocks each send on broker ACK, which is a fundamentally
      // different contract than NATS `publish()` or RabbitMQ `sendToQueue()` (both
      // non-blocking / no-ack). This bias is why Kafka always lost in prior runs.
      producer.send({ topic, messages: [{ value: payload }], acks: 0 })
        .catch(() => { errors++; });
      sent++;
      if (isStableWindow()) mensajesEnviadosEstables++;
    } catch (_) { errors++; }
  }, intervalMs);

  const metricsTimer = setInterval(async () => {
    const s = snapshot();
    log(`throughput=${s.throughput} msg/s  latency=${s.latency}ms  p99=${s.p99_latency_ms}ms  errors=${s.errors}`);
    await postMetric(s);
  }, 5000);

  // Wait for test duration or run indefinitely
  if (CONFIGURACION.isIndefinite) {
    log('Running in INDEFINITE mode - will run until cancelled');
    while (running) {
      await new Promise(r => setTimeout(r, 5000));
    }
  } else {
    await new Promise(r => setTimeout(r, CONFIGURACION.durationMs));
  }

  running = false;
  clearInterval(produceTimer);
  clearInterval(metricsTimer);
  await new Promise(r => setTimeout(r, 2000));

  const final = snapshot(true);
  log(`=== Final: sent=${final.messages_sent} recv=${final.messages_recv} latency=${final.latency}ms p99=${final.p99_latency_ms}ms ===`);
  await postTerminalMetric(final);

  await producer.disconnect();
  await consumer.disconnect();

  const adminClean = kafka.admin();
  await adminClean.connect();
  try { await adminClean.deleteTopics({ topics: [topic], timeout: 5000 }); } catch (_) { }
  await adminClean.disconnect();
}

// Runner: NATS
// NATS implementat: abans aquest cami acabava amb process.exit(1).
async function runNats() {
  const subject = `benchmark.${CONFIGURACION.runId}`;
  log(`=== Load Generator (NATS) ===`);
  log(`Format: ${CONFIGURACION.dataFormat}  |  MsgSize: ${CONFIGURACION.tamanoMensajeBytes}B  |  Rate: ${CONFIGURACION.mensajesPorSegundo} msg/s`);

  const natsUrl = process.env.NATS_URL || 'nats://nats.brokers.svc.cluster.local:4222';
  const nc = await retryBrokerStartupStep(() => natsConnect({
    servers: natsUrl,
    name: `load-generator-${CONFIGURACION.runId}`,
    reconnect: false,
    maxReconnectAttempts: 0,
    timeout: 10_000,
  }), {
    retries: 10,
    delayMs: 1500,
    stepName: 'NATS connect',
  });
  const sc = StringCodec();
  const payloadError = getNatsPayloadPreflightError(CONFIGURACION.tamanoMensajeBytes, nc.info);

  if (payloadError) {
    errors = Math.max(errors, 1);
    log(`FATAL: ${payloadError}`);
    await postTerminalMetric({
      ...snapshot(true),
      status: 'failed',
      errorCode: 'NATS_MAX_PAYLOAD_EXCEEDED',
      errorDetail: payloadError,
      natsMaxPayloadBytes: nc.info?.max_payload ?? null,
    });
    await nc.close();
    throw new Error(payloadError);
  }

  // Subscriptor (consumer)
  const sub = nc.subscribe(subject);
  await nc.flush();
  (async () => {
    for await (const msg of sub) {
      if (!running) break;
      received++;
      try {
        const p = JSON.parse(sc.decode(msg.data));
        const lat = nowMs() - p.ts;
        // Warm-up filter: see runKafka() for rationale.
        if (lat >= 0 && lat < 120000 && isStableWindow()) {
          latencies.push(lat);
          mensajesRecibidosEstables++;
        }
      } catch (_) { }
    }
  })();

  log(`NATS producer + consumer connected. Starting test (warm-up: ${CONFIGURACION.warmupSeconds}s)...`);
  const intervalMs = Math.max(1, Math.round(1000 / CONFIGURACION.mensajesPorSegundo));

  const produceTimer = setInterval(() => {
    if (!running) return;
    try {
      const payload = buildPayload(nowMs(), sent);
      nc.publish(subject, sc.encode(payload));
      sent++;
      if (isStableWindow()) mensajesEnviadosEstables++;
    } catch (_) { errors++; }
  }, intervalMs);

  const metricsTimer = setInterval(async () => {
    const s = snapshot();
    log(`throughput=${s.throughput} msg/s  latency=${s.latency}ms  p99=${s.p99_latency_ms}ms  errors=${s.errors}`);
    await postMetric(s);
  }, 5000);

  // Wait for test duration or run indefinitely
  if (CONFIGURACION.isIndefinite) {
    log('Running in INDEFINITE mode - will run until cancelled');
    while (running) {
      await new Promise(r => setTimeout(r, 5000));
    }
  } else {
    await new Promise(r => setTimeout(r, CONFIGURACION.durationMs));
  }

  running = false;
  clearInterval(produceTimer);
  clearInterval(metricsTimer);
  await new Promise(r => setTimeout(r, 2000));

  const final = snapshot(true);
  log(`=== Final: sent=${final.messages_sent} recv=${final.messages_recv} latency=${final.latency}ms p99=${final.p99_latency_ms}ms ===`);
  await postTerminalMetric(final);

  sub.unsubscribe();
  await nc.drain();
}

// Runner: RabbitMQ / AMQP / MQTT
// RabbitMQ implementat: abans aquest cami acabava amb process.exit(1).
async function runRabbitMQ() {
  const queue = `benchmark-${CONFIGURACION.runId}`;
  const amqpUrl = process.env.RABBITMQ_URL || 'amqp://admin:BenchmarkAdmin2024@rabbitmq.brokers.svc.cluster.local:5672';
  log(`=== Load Generator (RabbitMQ/AMQP) ===`);
  log(`Format: ${CONFIGURACION.dataFormat}  |  MsgSize: ${CONFIGURACION.tamanoMensajeBytes}B  |  Rate: ${CONFIGURACION.mensajesPorSegundo} msg/s`);

  // Parity config (see FAIR-COMPARISON CONTRACT at top of file).
  //   Queue: durable=false (no disk), autoDelete=true (ephemeral per run).
  //   Producer: sendToQueue without publisher confirms -> fire-and-forget.
  //   Consumer: noAck=true -> no per-message ACK round-trip to broker,
  //             symmetric with NATS pub/sub and Kafka acks=0 / autoCommit=false.
  //   One connection with a single channel is enough; the broker already
  //   multiplexes producer and consumer on the same TCP connection.
  const { conn, ch } = await retryBrokerStartupStep(async () => {
    const rabbitConnection = await amqp.connect(amqpUrl);
    try {
      const rabbitChannel = await rabbitConnection.createChannel();
      await rabbitChannel.assertQueue(queue, { durable: false, autoDelete: true, arguments: { 'x-expires': 3600000 } });
      return { conn: rabbitConnection, ch: rabbitChannel };
    } catch (error) {
      try { await rabbitConnection.close(); } catch (_) { }
      throw error;
    }
  }, {
    retries: 10,
    delayMs: 1500,
    stepName: 'RabbitMQ connect',
  });

  ch.consume(queue, (msg: any) => {
    if (!msg || !running) return;
    received++;
    try {
      const p = JSON.parse(msg.content.toString());
      const lat = nowMs() - p.ts;
      // Warm-up filter: see runKafka() for rationale.
      if (lat >= 0 && lat < 120000 && isStableWindow()) {
        latencies.push(lat);
        mensajesRecibidosEstables++;
      }
    } catch (_) { }
    // No ack: noAck:true below means broker already considers the message
    // delivered; calling ack() here would be an error.
  }, { noAck: true });

  log(`RabbitMQ producer + consumer connected. Starting test (warm-up: ${CONFIGURACION.warmupSeconds}s)...`);
  const intervalMs = Math.max(1, Math.round(1000 / CONFIGURACION.mensajesPorSegundo));

  const produceTimer = setInterval(() => {
    if (!running) return;
    try {
      const payload = buildPayload(nowMs(), sent);
      ch.sendToQueue(queue, Buffer.from(payload));
      sent++;
      if (isStableWindow()) mensajesEnviadosEstables++;
    } catch (_) { errors++; }
  }, intervalMs);

  const metricsTimer = setInterval(async () => {
    const s = snapshot();
    log(`throughput=${s.throughput} msg/s  latency=${s.latency}ms  p99=${s.p99_latency_ms}ms  errors=${s.errors}`);
    await postMetric(s);
  }, 5000);

  // Wait for test duration or run indefinitely
  if (CONFIGURACION.isIndefinite) {
    log('Running in INDEFINITE mode - will run until cancelled');
    while (running) {
      await new Promise(r => setTimeout(r, 5000));
    }
  } else {
    await new Promise(r => setTimeout(r, CONFIGURACION.durationMs));
  }

  running = false;
  clearInterval(produceTimer);
  clearInterval(metricsTimer);
  await new Promise(r => setTimeout(r, 2000));

  const final = snapshot(true);
  log(`=== Final: sent=${final.messages_sent} recv=${final.messages_recv} latency=${final.latency}ms p99=${final.p99_latency_ms}ms ===`);
  await postTerminalMetric(final);

  await conn.close();
}

// Punt d'entrada
(async () => {
  log(`[config] brokerType=${CONFIGURACION.brokerType}  dataFormat=${CONFIGURACION.dataFormat}  tamanoMensajeBytes=${CONFIGURACION.tamanoMensajeBytes}B  rate=${CONFIGURACION.mensajesPorSegundo}msg/s  duration=${CONFIGURACION.isIndefinite ? 'INDEFINITE' : CONFIGURACION.durationSeconds + 's'}`);
  try {
    await postMetric({
      ...snapshot(),
      status: 'running',
      event: 'load-generator-started',
    });
    // Routing complet: abans nomes 'kafka' funcionava.
    if (CONFIGURACION.brokerType === 'kafka') { await runKafka(); }
    else if (CONFIGURACION.brokerType === 'confluent') { await runKafka(); } // Confluent usa el cami Kafka-compatible en aquesta fase.
    else if (CONFIGURACION.brokerType === 'nats') { await runNats(); }
    else if (CONFIGURACION.brokerType === 'rabbitmq' || CONFIGURACION.brokerType === 'mqtt' || CONFIGURACION.brokerType === 'amqp') { await runRabbitMQ(); }
    else {
      log(`Broker "${CONFIGURACION.brokerType}" not implemented yet. Supported: kafka, confluent, nats, rabbitmq, mqtt, amqp`);
      process.exit(1);
    }
    process.exit(0);
  } catch (e) {
    log(`FATAL: ${(e as Error).message}`);
    if (!terminalMetricPosted) {
      errors = Math.max(errors, 1);
      await postTerminalMetric({
        ...snapshot(true),
        status: 'failed',
        errorCode: errorCodeFromBrokerFailure(e),
        errorDetail: e instanceof Error ? e.message : String(e),
      });
    }
    process.exit(1);
  }
})();
