import { Kafka, Partitioners, logLevel } from 'kafkajs';
import { connect as natsConnect, StringCodec } from 'nats';
import * as amqp from 'amqplib';
import * as http from 'http';
import { performance } from 'perf_hooks';

// ─────────────────────────────────────────────────────────────────────────────
// FAIR-COMPARISON CONTRACT (applies to Kafka, Confluent, NATS, RabbitMQ).
// Every runner MUST honour these rules so the only variation is the protocol
// itself, not the guarantees layered on top of it.
//
//   Producer:   fire-and-forget, no broker ACK, no publisher confirm.
//   Consumer:   single subscription, NO per-message ACK back to the broker,
//               push-style delivery (no artificial fetch wait).
//   Storage:    ephemeral; no disk persistence, no replication, 1 shard.
//   Topology:   1 producer + 1 consumer sharing the same process.
//
// If you add a broker runner, follow the same contract. Durability/ordering
// guarantees belong to a future `reliability` axis (`fast|safe|durable`),
// NOT to this "fast" mode.
// ─────────────────────────────────────────────────────────────────────────────

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
  // Warm-up seconds: first N seconds of latency samples are discarded to avoid
  // polluting the measurement with TCP handshake, consumer-group join, JIT
  // warm-up, and buffer initialisation. Standard practice in k6, wrk, YCSB.
  warmupSeconds: parseInt(process.env.WARMUP_SECONDS || '5'),
};

let sent = 0, received = 0, errors = 0;
// Post-warmup counters, used for stable-state throughput calculation.
let sentStable = 0, recvStable = 0;
const latencies: number[] = [];
const startTime = Date.now();
let running = true;

// True after warm-up window has elapsed; from this point latency samples count.
function isStableWindow(): boolean {
  return (Date.now() - startTime) / 1000 >= CFG.warmupSeconds;
}

// Delivery model of the current broker — intrinsic protocol property, NOT
// a benchmark artefact. Reported in every metric doc so downstream analysis
// can group/filter by push vs pull.
function deliveryModel(): 'pull' | 'push' {
  const t = CFG.brokerType;
  if (t === 'kafka' || t === 'confluent') return 'pull';
  return 'push'; // nats, rabbitmq, mqtt, amqp
}

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
// Latency array contains ONLY post-warmup samples (see isStableWindow()).
// Throughput is reported both for the full window (back-compat) and for the
// stable window (recommended for analysis).
function snapshot(final = false) {
  const elapsed = (Date.now() - startTime) / 1000 || 1;
  const stableElapsed = Math.max(0.001, elapsed - CFG.warmupSeconds);
  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
  const p50 = sorted.length ? sorted[Math.floor(sorted.length * 0.50)] : 0;
  const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
  const p99 = sorted.length ? sorted[Math.floor(sorted.length * 0.99)] : 0;
  return {
    runId: CFG.runId,
    scenarioId: CFG.scenarioId,
    architecture: CFG.architecture,
    protocol: CFG.protocol,
    broker: CFG.brokerType,
    platform: CFG.platform,
    dataFormat: CFG.dataFormat,
    // Fair-comparison metadata: reproducibility + transparency.
    deliveryModel: deliveryModel(),              // 'pull' (kafka/confluent) | 'push' (nats/rmq)
    warmupSeconds: CFG.warmupSeconds,            // samples before this are discarded
    maxFetchWaitMs: (CFG.brokerType === 'kafka' || CFG.brokerType === 'confluent') ? 1 : 0,
    // Latency (averaged over post-warmup samples only).
    latency: Math.round(avg * 1000) / 1000,
    p50_latency_ms: Math.round(p50 * 1000) / 1000,
    p95_latency_ms: Math.round(p95 * 1000) / 1000,
    p99_latency_ms: Math.round(p99 * 1000) / 1000,
    // Throughput: full-window (legacy) + stable-window (post-warmup, use this one).
    throughput: Math.round((received / elapsed) * 100) / 100,
    throughput_stable: Math.round((recvStable / stableElapsed) * 100) / 100,
    errorRate: sent > 0 ? Math.round((errors / sent) * 10000) / 10000 : 0,
    messages_sent: sent,
    messages_recv: received,
    messages_sent_stable: sentStable,
    messages_recv_stable: recvStable,
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
  // Parity config (see FAIR-COMPARISON CONTRACT at top of file).
  //   Producer: acks=0, no idempotence, no transaction → matches NATS/RabbitMQ
  //             fire-and-forget semantics.
  //   Consumer: tiny fetch wait (maxWaitTimeInMs=1) → kafkajs default is 5000
  //             which artificially inflates Kafka latency at low rates. At 1ms
  //             the pull loop is essentially continuous and the artefact is
  //             reduced to statistical noise (<0.5ms avg) while still using
  //             long-polling (no CPU-pinned busy loop).
  //             autoCommit=false → no periodic offset-commit round-trips,
  //             symmetric with NATS/RabbitMQ which have no offset concept.
  const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
    idempotent: false,
    transactionalId: undefined,
  });
  const consumer = kafka.consumer({
    groupId: `bench-${CFG.runId}`,
    sessionTimeout: 10000,
    heartbeatInterval: 3000,
    maxWaitTimeInMs: 1,
    minBytes: 1,
  });

  await admin.connect();
  // Single partition removes cross-partition coordination overhead.
  // For a 1-producer / 1-consumer benchmark, multiple partitions only add
  // consumer-group fetch/commit chatter without any real parallelism benefit.
  await admin.createTopics({
    topics: [{
      topic, numPartitions: 1, replicationFactor: 1,
      configEntries: [
        { name: 'retention.ms', value: '3600000' },
        { name: 'max.message.bytes', value: '4194304' }, // 4 MB — covers video-8k (2 MB) with headroom
      ],
    }],
    waitForLeaders: true,
  });
  await admin.disconnect();
  log(`Topic ${topic} created`);

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });
  consumer.run({
    // autoCommit=false: no offset-commit traffic. Symmetric with NATS pub/sub
    // and RabbitMQ `noAck:true`, which also keep zero consumer-side state
    // on the broker.
    autoCommit: false,
    eachMessage: async ({ message }) => {
      if (!running) return;
      received++;
      if (message.value) {
        try {
          const p = JSON.parse(message.value.toString());
          const lat = nowMs() - p.ts;                      // BUG 3 FIX: performance.now()
          // Only count latency samples AFTER warm-up window. Early samples
          // include TCP handshake, consumer-group join, JIT compilation, and
          // socket buffer initialisation — all one-off costs that shouldn't
          // skew steady-state measurement.
          if (lat >= 0 && lat < 120000 && isStableWindow()) {
            latencies.push(lat);
            recvStable++;
          }
        } catch (_) { }
      }
    },
  });

  await producer.connect();
  log(`Producer + consumer connected. Starting test (warm-up: ${CFG.warmupSeconds}s)...`);

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
      if (isStableWindow()) sentStable++;
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
        // Warm-up filter: see runKafka() for rationale.
        if (lat >= 0 && lat < 120000 && isStableWindow()) {
          latencies.push(lat);
          recvStable++;
        }
      } catch (_) { }
    }
  })();

  log(`NATS producer + consumer connected. Starting test (warm-up: ${CFG.warmupSeconds}s)...`);
  const intervalMs = Math.max(1, Math.round(1000 / CFG.msgPerSec));

  const produceTimer = setInterval(() => {
    if (!running) return;
    try {
      const payload = buildPayload(nowMs(), sent);
      nc.publish(subject, sc.encode(payload));
      sent++;
      if (isStableWindow()) sentStable++;
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

  // Parity config (see FAIR-COMPARISON CONTRACT at top of file).
  //   Queue: durable=false (no disk), autoDelete=true (ephemeral per run).
  //   Producer: sendToQueue without publisher confirms → fire-and-forget.
  //   Consumer: noAck=true → no per-message ACK round-trip to broker,
  //             symmetric with NATS pub/sub and Kafka acks=0 / autoCommit=false.
  //   One connection with a single channel is enough; the broker already
  //   multiplexes producer and consumer on the same TCP connection.
  const conn = await amqp.connect(amqpUrl);
  const ch = await conn.createChannel();

  await ch.assertQueue(queue, { durable: false, autoDelete: true, arguments: { 'x-expires': 3600000 } });

  ch.consume(queue, (msg: any) => {
    if (!msg || !running) return;
    received++;
    try {
      const p = JSON.parse(msg.content.toString());
      const lat = nowMs() - p.ts;
      // Warm-up filter: see runKafka() for rationale.
      if (lat >= 0 && lat < 120000 && isStableWindow()) {
        latencies.push(lat);
        recvStable++;
      }
    } catch (_) { }
    // No ack: noAck:true below means broker already considers the message
    // delivered; calling ack() here would be an error.
  }, { noAck: true });

  log(`RabbitMQ producer + consumer connected. Starting test (warm-up: ${CFG.warmupSeconds}s)...`);
  const intervalMs = Math.max(1, Math.round(1000 / CFG.msgPerSec));

  const produceTimer = setInterval(() => {
    if (!running) return;
    try {
      const payload = buildPayload(nowMs(), sent);
      ch.sendToQueue(queue, Buffer.from(payload));
      sent++;
      if (isStableWindow()) sentStable++;
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