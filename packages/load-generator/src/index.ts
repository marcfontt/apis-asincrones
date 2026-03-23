import { Kafka, Partitioners, logLevel } from 'kafkajs';
import * as http from 'http';

const CFG = {
  scenarioId:   process.env.SCENARIO_ID          || 'unknown',
  runId:        process.env.RUN_ID                || 'unknown',
  brokerType:   (process.env.BROKER_TYPE          || 'kafka').toLowerCase(),
  kafkaBrokers: (process.env.KAFKA_BROKERS        || 'kafka.apis-asincronas.svc.cluster.local:9092').split(','),
  esUrl:        process.env.ELASTICSEARCH_URL     || 'http://elasticsearch.apis-asincronas.svc.cluster.local:9200',
  durationMs:   parseInt(process.env.TEST_DURATION_SECONDS || '60') * 1000,
  msgPerSec:    parseInt(process.env.MESSAGES_PER_SECOND   || '100'),
  msgSize:      parseInt(process.env.MESSAGE_SIZE_BYTES    || '256'),
};

let sent = 0, received = 0, errors = 0;
const latencies: number[] = [];
const startTime = Date.now();
let running = true;

const log = (msg: string) => console.log(`[${new Date().toISOString()}] ${msg}`);

function snapshot(final = false) {
  const elapsed = (Date.now() - startTime) / 1000 || 1;
  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
  const p99 = sorted.length ? sorted[Math.floor(sorted.length * 0.99)] : 0;
  return {
    runId: CFG.runId, scenarioId: CFG.scenarioId, brokerType: CFG.brokerType,
    '@timestamp': new Date().toISOString(),
    elapsed_s: Math.round(elapsed),
    messages_sent: sent, messages_recv: received, errors,
    throughput_rps: Math.round((received / elapsed) * 100) / 100,
    avg_latency_ms: Math.round(avg * 10) / 10,
    p99_latency_ms: Math.round(p99 * 10) / 10,
    error_rate: sent > 0 ? Math.round((errors / sent) * 10000) / 10000 : 0,
    ...(final ? { status: 'completed' } : {}),
  };
}

function postToEs(index: string, doc: object): Promise<void> {
  return new Promise((resolve) => {
    const body = JSON.stringify(doc);
    try {
      const u = new URL(`${CFG.esUrl}/${index}/_doc`);
      const req = http.request({
        hostname: u.hostname, port: parseInt(u.port || '9200'),
        path: u.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => { res.on('data', () => {}); res.on('end', resolve); });
      req.on('error', () => resolve());
      req.write(body); req.end();
    } catch { resolve(); }
  });
}

async function runKafka() {
  const topic = `benchmark-${CFG.runId}`;
  log(`=== Load Generator ===`);
  log(`Scenario : ${CFG.scenarioId}`);
  log(`Run ID   : ${CFG.runId}`);
  log(`Broker   : Kafka (${CFG.kafkaBrokers.join(', ')})`);
  log(`Topic    : ${topic}`);
  log(`Duration : ${CFG.durationMs / 1000}s  |  Target: ${CFG.msgPerSec} msg/s`);

  const kafka = new Kafka({
    clientId: `load-gen-${CFG.runId}`,
    brokers: CFG.kafkaBrokers,
    logLevel: logLevel.WARN,
    connectionTimeout: 15000,
    retry: { retries: 8, initialRetryTime: 1000 },
  });

  const admin    = kafka.admin();
  const producer = kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
  const consumer = kafka.consumer({ groupId: `bench-${CFG.runId}`, sessionTimeout: 30000 });

  await admin.connect();
  await admin.createTopics({
    topics: [{ topic, numPartitions: 3, replicationFactor: 1,
               configEntries: [{ name: 'retention.ms', value: '3600000' }] }],
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
          const lat = Date.now() - p.ts;
          if (lat >= 0 && lat < 120000) latencies.push(lat);
        } catch (_) {}
      }
    },
  });

  await producer.connect();
  log('Producer + consumer connected. Starting test...');

  const intervalMs = Math.max(1, Math.round(1000 / CFG.msgPerSec));
  const pad = Math.max(0, CFG.msgSize - 60);

  const produceTimer = setInterval(async () => {
    if (!running) return;
    try {
      await producer.send({
        topic,
        messages: [{ value: JSON.stringify({ ts: Date.now(), runId: CFG.runId, seq: sent, d: 'x'.repeat(pad) }) }],
      });
      sent++;
    } catch (_) { errors++; }
  }, intervalMs);

  const metricsTimer = setInterval(async () => {
    const s = snapshot();
    log(`throughput=${s.throughput_rps} msg/s  latency_avg=${s.avg_latency_ms}ms  p99=${s.p99_latency_ms}ms  errors=${s.errors}`);
    await postToEs('async-metrics', s);
  }, 5000);

  await new Promise(r => setTimeout(r, CFG.durationMs));

  running = false;
  clearInterval(produceTimer);
  clearInterval(metricsTimer);
  await new Promise(r => setTimeout(r, 2000));

  const final = snapshot(true);
  log(`=== Final: sent=${final.messages_sent} recv=${final.messages_recv} avg=${final.avg_latency_ms}ms throughput=${final.throughput_rps} msg/s ===`);
  await postToEs('async-metrics', final);
  await postToEs('async-benchmarks', final);

  await producer.disconnect();
  await consumer.disconnect();

  const adminClean = kafka.admin();
  await adminClean.connect();
  try { await adminClean.deleteTopics({ topics: [topic], timeout: 5000 }); } catch (_) {}
  await adminClean.disconnect();

  log('Done.');
}

(async () => {
  try {
    if (CFG.brokerType === 'kafka') { await runKafka(); }
    else { log(`Broker "${CFG.brokerType}" not implemented`); process.exit(1); }
    process.exit(0);
  } catch (e) {
    log(`FATAL: ${(e as Error).message}`);
    process.exit(1);
  }
})();
