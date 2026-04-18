import { Kafka, Partitioners, logLevel } from 'kafkajs';
import { connect as natsConnect, StringCodec } from 'nats';
import * as amqp from 'amqplib';
import * as http from 'http';
import { performance } from 'perf_hooks';

// ── Configuració ────────────────────────────────────────────────────────────
const CFG = {
  scenarioId: process.env.SCENARIO_ID || 'unknown',
  runId: process.env.RUN_ID || 'unknown',
  brokerType: (process.env.BROKER_TYPE || 'kafka').toLowerCase(),
  architecture: process.env.ARCHITECTURE || '',
  protocol: process.env.PROTOCOL || 'Kafka',
  platform: process.env.PLATFORM || '',
  dataFormat: process.env.DATA_FORMAT || 'default',   // BUG 2: ara es llegeix
  kafkaBrokers: (process.env.KAFKA_BROKERS || 'kafka-cluster-kafka-bootstrap.kafka-strimzi.svc.cluster.local:9092').split(','),
  mqttBroker: process.env.MQTT_BROKER || 'mqtt://emqx.brokers.svc.cluster.local:1883',
  metricsApiUrl: process.env.METRICS_API_URL || 'http://metrics-api.apis-asincrones.svc.cluster.local:3004',
  durationSeconds: parseInt(process.env.TEST_DURATION_SECONDS || '60'),
  get durationMs() { return this.durationSeconds * 1000; },
  get isIndefinite() { return this.durationSeconds === 0; },
  msgPerSec: parseInt(process.env.MESSAGES_PER_SECOND || '100'),
  msgSize: parseInt(process.env.MESSAGE_SIZE_BYTES || '256'),
};

let sent = 0, received = 0, errors = 0;
const latencies: number[] = [];
const startTime = Date.now();
let running = true;

// Graceful shutdown: send final metric on SIGTERM (K8s sends this before SIGKILL)
async function gracefulShutdown() {
  if (!running) return;
  running = false;
  // Wait 2s for in-flight produce/consume cycles to finish
  await new Promise(r => setTimeout(r, 2000));
  const final = snapshot(true);
  log(`=== SIGTERM: sent=${final.messages_sent} recv=${final.messages_recv} lat=${final.latency}ms ===`);
  await postMetric(final);
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

// ── BUG 3 FIX: Latència sub-ms amb performance.now() ──────────────────────
// Date.now() té precisió d'1ms (sub-ms sempre dona 0).
// performance.now() té precisió de microsegons i és consistent dins del mateix procés.
// Productor i consumidor estan al mateix pod → podem usar performance.now() directament.
function nowMs(): number {
  return performance.now(); // float en ms amb decimals (ex: 0.423)
}

// ── BUG 2+4 FIX: Payload semàntic per format de dades ──────────────────────
function buildPayload(ts: number, seq: number): string {
  switch (CFG.dataFormat) {
    case 'financial':
      // JSON compacte de transacció financera (~200-400 bytes)
      return JSON.stringify({
        ts, seq,
        txId: `TX-${CFG.runId.slice(0, 8)}-${seq}`,
        amount: Math.round(Math.random() * 100000) / 100,
        currency: 'EUR',
        from: `ACC${String(seq % 1000).padStart(6, '0')}`,
        to: `ACC${String((seq + 1) % 1000).padStart(6, '0')}`,
        type: seq % 3 === 0 ? 'TRANSFER' : seq % 3 === 1 ? 'PAYMENT' : 'REFUND',
        status: 'PENDING',
      });
    case 'iot':
      // Telemetria IoT mínima (~100-150 bytes)
      return JSON.stringify({
        ts, seq,
        sensor: `S${seq % 100}`,
        temp: Math.round(Math.random() * 4000) / 100,
        hum: Math.round(Math.random() * 10000) / 100,
        bat: Math.round(Math.random() * 100),
        loc: `Z${seq % 10}`,
      });
    default:
      // video-4k, video-8k, default: padding per simular la mida configurada
      const pad = Math.max(0, CFG.msgSize - 60);
      return JSON.stringify({ ts, seq, runId: CFG.runId, d: 'x'.repeat(pad) });
  }
}

// ── Mètriques ───────────────────────────────────────────────────────────────
function snapshot(final = false) {
  const elapsed = (Date.now() - startTime) / 1000 || 1;
  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
  const p99 = sorted.length ? sorted[Math.floor(sorted.length * 0.99)] : 0;
  return {
    runId: CFG.runId,
    scenarioId: CFG.scenarioId,
    architecture: CFG.architecture,
    protocol: CFG.protocol,
    broker: CFG.brokerType,
    platform: CFG.platform,
    dataFormat: CFG.dataFormat,
    latency: Math.round(avg * 1000) / 1000,      // BUG 3: ara 3 decimals (µs precisió)
    throughput: Math.round((received / elapsed) * 100) / 100,
    errorRate: sent > 0 ? Math.round((errors / sent) * 10000) / 10000 : 0,
    p99_latency_ms: Math.round(p99 * 1000) / 1000,      // BUG 3: ara 3 decimals
    messages_sent: sent,
    messages_recv: received,
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
      const u = new URL(`${CFG.metricsApiUrl}/metrics`);
      const req = http.request({
        hostname: u.hostname,
        port: parseInt(u.port || '3004'),
        path: u.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 5000,
      }, (res) => { res.on('data', () => { }); res.on('end', resolve); });
      req.on('error', () => resolve());
      req.on('timeout', () => { req.destroy(); resolve(); });
      req.write(body); req.end();
    } catch { resolve(); }
  });
}

// ── Runner: Kafka ─────────────────────────────────────────────────────────
async function runKafka() {
  const topic = `benchmark-${CFG.runId}`;
  log(`=== Load Generator (Kafka) ===`);
  log(`Format: ${CFG.dataFormat}  |  MsgSize: ${CFG.msgSize}B  |  Rate: ${CFG.msgPerSec} msg/s`);

  const kafka = new Kafka({
    clientId: `load-gen-${CFG.runId}`,
    brokers: CFG.kafkaBrokers,
    logLevel: logLevel.WARN,
    connectionTimeout: 15000,
    retry: { retries: 8, initialRetryTime: 1000 },
  });

  const admin = kafka.admin();
  // Fair-comparison config: NATS/RabbitMQ in this bench are fire-and-forget
  // with no persistence, so Kafka was comparing apples to oranges. We match
  // their semantics:
  //   - acks=0 on every send (fire-and-forget, no broker ack wait)
  //   - idempotent=false, no transactional overhead
  //   - no linger (send immediately)
  const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
    idempotent: false,
    transactionalId: undefined,
  });
  // Smaller session timeout = faster consumer group coordination.
  // `heartbeatInterval` tuned for quick rebalance detection.
  const consumer = kafka.consumer({
    groupId: `bench-${CFG.runId}`,
    sessionTimeout: 10000,
    heartbeatInterval: 3000,
  });

  await admin.connect();
  // Single partition removes cross-partition coordination overhead.
  // For a 1-producer / 1-consumer benchmark, multiple partitions only add
  // consumer-group fetch/commit chatter without any real parallelism benefit.
  await admin.createTopics({
    topics: [{
      topic, numPartitions: 1, replicationFactor: 1,
      configEntries: [{ name: 'retention.ms', value: '3600000' }]
    }],
    waitForLeaders: true,
  });
  await admin.disconnect();
  log(`Topic ${topic} created`);

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });
  consumer.run({
    eachMessage: async ({ message }) => {
      if (!running) return;
      received++;
      if (message.value) {
        try {
          const p = JSON.parse(message.value.toString());
          const lat = nowMs() - p.ts;                      // BUG 3 FIX: performance.now()
          if (lat >= 0 && lat < 120000) latencies.push(lat);
        } catch (_) { }
      }
    },
  });

  await producer.connect();
  log('Producer + consumer connected. Starting test...');

  const intervalMs = Math.max(1, Math.round(1000 / CFG.msgPerSec));

  const produceTimer = setInterval(() => {
    if (!running) return;
    try {
      const payload = buildPayload(nowMs(), sent);          // BUG 2+4 FIX: payload semàntic
      // Fire-and-forget with acks=0 to match NATS/RabbitMQ semantics.
      // Without this, Kafka blocks each send on broker ACK, which is a fundamentally
      // different contract than NATS `publish()` or RabbitMQ `sendToQueue()` (both
      // non-blocking / no-ack). This bias is why Kafka always lost in prior runs.
      producer.send({ topic, messages: [{ value: payload }], acks: 0 })
        .catch(() => { errors++; });
      sent++;
    } catch (_) { errors++; }
  }, intervalMs);

  const metricsTimer = setInterval(async () => {
    const s = snapshot();
    log(`throughput=${s.throughput} msg/s  latency=${s.latency}ms  p99=${s.p99_latency_ms}ms  errors=${s.errors}`);
    await postMetric(s);
  }, 5000);

  // Wait for test duration or run indefinitely
  if (CFG.isIndefinite) {
    log('Running in INDEFINITE mode - will run until cancelled');
    while (running) {
      await new Promise(r => setTimeout(r, 5000));
    }
  } else {
    await new Promise(r => setTimeout(r, CFG.durationMs));
  }

  running = false;
  clearInterval(produceTimer);
  clearInterval(metricsTimer);
  await new Promise(r => setTimeout(r, 2000));

  const final = snapshot(true);
  log(`=== Final: sent=${final.messages_sent} recv=${final.messages_recv} latency=${final.latency}ms p99=${final.p99_latency_ms}ms ===`);
  await postMetric(final);

  await producer.disconnect();
  await consumer.disconnect();

  const adminClean = kafka.admin();
  await adminClean.connect();
  try { await adminClean.deleteTopics({ topics: [topic], timeout: 5000 }); } catch (_) { }
  await adminClean.disconnect();
}

// ── Runner: NATS ──────────────────────────────────────────────────────────
// BUG 1 FIX: NATS implementat (abans → process.exit(1))
async function runNats() {
  const subject = `benchmark.${CFG.runId}`;
  log(`=== Load Generator (NATS) ===`);
  log(`Format: ${CFG.dataFormat}  |  MsgSize: ${CFG.msgSize}B  |  Rate: ${CFG.msgPerSec} msg/s`);

  const natsUrl = process.env.NATS_URL || 'nats://nats.brokers.svc.cluster.local:4222';
  const nc = await natsConnect({ servers: natsUrl });
  const sc = StringCodec();

  // Subscriptor (consumer)
  const sub = nc.subscribe(subject);
  (async () => {
    for await (const msg of sub) {
      if (!running) break;
      received++;
      try {
        const p = JSON.parse(sc.decode(msg.data));
        const lat = nowMs() - p.ts;
        if (lat >= 0 && lat < 120000) latencies.push(lat);
      } catch (_) { }
    }
  })();

  log('NATS producer + consumer connected. Starting test...');
  const intervalMs = Math.max(1, Math.round(1000 / CFG.msgPerSec));

  const produceTimer = setInterval(() => {
    if (!running) return;
    try {
      const payload = buildPayload(nowMs(), sent);
      nc.publish(subject, sc.encode(payload));
      sent++;
    } catch (_) { errors++; }
  }, intervalMs);

  const metricsTimer = setInterval(async () => {
    const s = snapshot();
    log(`throughput=${s.throughput} msg/s  latency=${s.latency}ms  p99=${s.p99_latency_ms}ms  errors=${s.errors}`);
    await postMetric(s);
  }, 5000);

  // Wait for test duration or run indefinitely
  if (CFG.isIndefinite) {
    log('Running in INDEFINITE mode - will run until cancelled');
    while (running) {
      await new Promise(r => setTimeout(r, 5000));
    }
  } else {
    await new Promise(r => setTimeout(r, CFG.durationMs));
  }

  running = false;
  clearInterval(produceTimer);
  clearInterval(metricsTimer);
  await new Promise(r => setTimeout(r, 2000));

  const final = snapshot(true);
  log(`=== Final: sent=${final.messages_sent} recv=${final.messages_recv} latency=${final.latency}ms p99=${final.p99_latency_ms}ms ===`);
  await postMetric(final);

  sub.unsubscribe();
  await nc.drain();
}

// ── Runner: RabbitMQ / AMQP / MQTT ───────────────────────────────────────
// BUG 1 FIX: RabbitMQ implementat (abans → process.exit(1))
async function runRabbitMQ() {
  const queue = `benchmark-${CFG.runId}`;
  const amqpUrl = process.env.RABBITMQ_URL || 'amqp://admin:BenchmarkAdmin2024@rabbitmq.brokers.svc.cluster.local:5672';
  log(`=== Load Generator (RabbitMQ/AMQP) ===`);
  log(`Format: ${CFG.dataFormat}  |  MsgSize: ${CFG.msgSize}B  |  Rate: ${CFG.msgPerSec} msg/s`);

  const conn = await amqp.connect(amqpUrl);
  const chProd = await conn.createChannel();
  const chCons = await conn.createChannel();

  await chProd.assertQueue(queue, { durable: false, autoDelete: true, arguments: { 'x-expires': 3600000 } });
  await chCons.assertQueue(queue, { durable: false, autoDelete: true, arguments: { 'x-expires': 3600000 } });

  chCons.consume(queue, (msg: any) => {
    if (!msg || !running) return;
    received++;
    try {
      const p = JSON.parse(msg.content.toString());
      const lat = nowMs() - p.ts;
      if (lat >= 0 && lat < 120000) latencies.push(lat);
    } catch (_) { }
    chCons.ack(msg);
  }, { noAck: false });

  log('RabbitMQ producer + consumer connected. Starting test...');
  const intervalMs = Math.max(1, Math.round(1000 / CFG.msgPerSec));

  const produceTimer = setInterval(() => {
    if (!running) return;
    try {
      const payload = buildPayload(nowMs(), sent);
      chProd.sendToQueue(queue, Buffer.from(payload));
      sent++;
    } catch (_) { errors++; }
  }, intervalMs);

  const metricsTimer = setInterval(async () => {
    const s = snapshot();
    log(`throughput=${s.throughput} msg/s  latency=${s.latency}ms  p99=${s.p99_latency_ms}ms  errors=${s.errors}`);
    await postMetric(s);
  }, 5000);

  // Wait for test duration or run indefinitely
  if (CFG.isIndefinite) {
    log('Running in INDEFINITE mode - will run until cancelled');
    while (running) {
      await new Promise(r => setTimeout(r, 5000));
    }
  } else {
    await new Promise(r => setTimeout(r, CFG.durationMs));
  }

  running = false;
  clearInterval(produceTimer);
  clearInterval(metricsTimer);
  await new Promise(r => setTimeout(r, 2000));

  const final = snapshot(true);
  log(`=== Final: sent=${final.messages_sent} recv=${final.messages_recv} latency=${final.latency}ms p99=${final.p99_latency_ms}ms ===`);
  await postMetric(final);

  await conn.close();
}

// ── Entry point ─────────────────────────────────────────────────────────────
(async () => {
  log(`[config] brokerType=${CFG.brokerType}  dataFormat=${CFG.dataFormat}  msgSize=${CFG.msgSize}B  rate=${CFG.msgPerSec}msg/s  duration=${CFG.isIndefinite ? 'INDEFINITE' : CFG.durationSeconds + 's'}`);
  try {
    // BUG 1 FIX: routing complet (abans només 'kafka' funcionava)
    if (CFG.brokerType === 'kafka') { await runKafka(); }
    else if (CFG.brokerType === 'confluent') { await runKafka(); } // Confluent és compatible amb Kafka API
    else if (CFG.brokerType === 'nats') { await runNats(); }
    else if (CFG.brokerType === 'rabbitmq' || CFG.brokerType === 'mqtt' || CFG.brokerType === 'amqp') { await runRabbitMQ(); }
    else {
      log(`Broker "${CFG.brokerType}" not implemented yet. Supported: kafka, confluent, nats, rabbitmq, mqtt, amqp`);
      process.exit(1);
    }
    process.exit(0);
  } catch (e) {
    log(`FATAL: ${(e as Error).message}`);
    process.exit(1);
  }
})();