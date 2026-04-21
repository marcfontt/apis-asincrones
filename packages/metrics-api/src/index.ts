import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Client } from '@elastic/elasticsearch';
import { v4 as uuidv4 } from 'uuid';
import { shouldIncludeRunInHistory } from './historySummary';

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const es = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200' });
const INDEX = 'async-metrics';

// ── WebSocket: Live metrics per runId ─────────────────────────────────────────
// Els clients es subscriuen amb: { action: "subscribe", runId: "xxx" }
// La Metrics API fa broadcast quan rep POST /metrics
const subscribers = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws: WebSocket) => {
  let subscribedRunId: string | null = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.action === 'subscribe' && msg.runId) {
        subscribedRunId = msg.runId;
        if (!subscribers.has(msg.runId)) subscribers.set(msg.runId, new Set());
        subscribers.get(msg.runId)!.add(ws);
        ws.send(JSON.stringify({ event: 'subscribed', runId: msg.runId }));
      }
    } catch (_) {}
  });

  ws.on('close', () => {
    if (subscribedRunId) subscribers.get(subscribedRunId)?.delete(ws);
  });
});

function broadcast(runId: string, metric: object) {
  subscribers.get(runId)?.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: 'metric', data: metric }));
    }
  });
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'metrics-api' });
});

// ── GET /metrics — amb filtres ────────────────────────────────────────────────
// Query params: runId, architecture, protocol, broker, gateway, scenarioId
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    const { runId, architecture, protocol, broker, gateway, scenarioId } = req.query;

    const must: object[] = [];
    if (runId)       must.push({ match: { runId } });
    if (architecture) must.push({ match: { architecture } });
    if (protocol)    must.push({ match: { protocol } });
    if (broker)      must.push({ match: { broker } });
    if (gateway)     must.push({ match: { gateway } });
    if (scenarioId)  must.push({ match: { scenarioId } });

    const query = must.length > 0 ? { bool: { must } } : { match_all: {} };

    const result = await es.search({
      index: INDEX,
      body: { query, size: 10000, sort: [{ timestamp: { order: 'asc' } }] },
    });

    const hits = (result.hits?.hits ?? []).map((h: any) => ({ id: h._id, ...h._source }));
    res.json(hits);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /metrics/compare — side-by-side per scenarioIds ──────────────────────
// Query: scenarioIds=id1,id2,id3
app.get('/metrics/compare', async (req: Request, res: Response) => {
  try {
    const { scenarioIds } = req.query;
    if (!scenarioIds) { res.status(400).json({ error: 'scenarioIds required' }); return; }

    const ids = (scenarioIds as string).split(',');
    const results: Record<string, object[]> = {};

    for (const sid of ids) {
      const result = await es.search({
        index: INDEX,
        body: {
          query: { match: { scenarioId: sid } },
          size: 10000,
          sort: [{ timestamp: { order: 'asc' } }],
        },
      });
      results[sid] = (result.hits?.hits ?? []).map((h: any) => ({ id: h._id, ...h._source }));
    }

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /metrics/summary — agregació per run (cada run = una fila) ───────────
// Agrupa per runId per tenir historial per execucio independent del scenario
app.get('/metrics/summary', async (_req: Request, res: Response) => {
  try {
    // ──────────────────────────────────────────────────────────────────────
    // IMPORTANT: why we read from the LAST doc, not average across docs.
    //
    // The load-generator posts a cumulative snapshot every 5 seconds and a
    // final cumulative snapshot at run end. EACH doc's `latency`,
    // `throughput`, `errorRate`, `p50_latency_ms`, `p95_latency_ms`,
    // `p99_latency_ms` is a RUNNING AVERAGE over samples seen so far in the
    // run — NOT a per-interval measurement.
    //
    // Averaging a running-average across docs biases the result toward the
    // earliest measurements (when the window is small and avg is typically
    // higher). The correct "final answer" for any cumulative field lives in
    // the LAST doc of the run. We pick it with top_hits sorted by timestamp
    // desc, size 1.
    //
    // `messages_sent`/`messages_recv` are monotonic counters → the last
    // doc's value is the true run total, and is used as `count` so the UI
    // shows real message counts instead of "number of snapshot docs".
    // ──────────────────────────────────────────────────────────────────────
    const result = await es.search({
      index: INDEX,
      body: {
        size: 0,
        aggs: {
          by_run: {
            terms: { field: 'runId.keyword', size: 500 },
            aggs: {
              // Pick the final snapshot of each run. All cumulative fields
              // are read from here. Avoids the "average of running-averages"
              // bias that corrupts the history vs. live comparison.
              last_doc: {
                top_hits: {
                  size: 1,
                  sort: [{ timestamp: { order: 'desc' } }],
                  _source: [
                    'scenarioId', 'architecture', 'protocol', 'broker', 'platform', 'dataFormat',
                    'latency', 'throughput', 'errorRate', 'status',
                    'p50_latency_ms', 'p95_latency_ms', 'p99_latency_ms',
                    'messages_sent', 'messages_recv',
                    'messages_sent_stable', 'messages_recv_stable',
                    'throughput_stable',
                    'deliveryModel', 'warmupSeconds',
                  ],
                },
              },
              // min/max timestamp per run so the UI can time-filter history
              // against real run boundaries instead of guessing via last sample.
              started_at:     { min: { field: 'timestamp' } },
              ended_at:       { max: { field: 'timestamp' } },
            },
          },
        },
      },
    });

    const buckets = (result.aggregations?.by_run as any)?.buckets ?? [];
    const summary = buckets.map((b: any) => {
      // Pull the final cumulative snapshot for this run. All per-run stats
      // are read from here (see block comment above for the rationale).
      const last = b.last_doc?.hits?.hits?.[0]?._source ?? {};
      return {
        runId:         b.key,
        scenarioId:    last.scenarioId,
        // `count` keeps backwards compatibility with the old UI contract:
        // real messages received (monotonic counter). Falls back to the
        // snapshot-doc count only if the field is missing (very old data).
        count:         last.messages_recv ?? b.doc_count,
        // `pointCount` / `measureCount` represent telemetry documents for
        // this run. The history UI uses this to show accumulated measures
        // instead of confusing them with delivered messages.
        pointCount:    b.doc_count,
        measureCount:  b.doc_count,
        messagesSent:  last.messages_sent ?? null,
        messagesRecv:  last.messages_recv ?? null,
        // Cumulative averages from the FINAL snapshot, not avg-of-avgs.
        avgLatency:    last.latency,
        avgThroughput: last.throughput_stable ?? last.throughput,
        avgErrorRate:  last.errorRate,
        // Percentiles computed per-run by the load-generator over its
        // post-warm-up latency array. Already the correct per-run answer.
        p50Latency:    last.p50_latency_ms,
        p95Latency:    last.p95_latency_ms,
        p99Latency:    last.p99_latency_ms,
        architecture:  last.architecture,
        protocol:      last.protocol,
        broker:        last.broker,
        platform:      last.platform,
        dataFormat:    last.dataFormat,
        deliveryModel: last.deliveryModel,
        status:        last.status,
        // ISO strings preferred over epoch ms so the UI can Date.parse() directly
        startedAt:     b.started_at?.value_as_string ?? (b.started_at?.value != null ? new Date(b.started_at.value).toISOString() : null),
        endedAt:       b.ended_at?.value_as_string   ?? (b.ended_at?.value   != null ? new Date(b.ended_at.value).toISOString()   : null),
      };
    }).filter((run: { status?: unknown; endedAt?: string | null }) =>
      shouldIncludeRunInHistory({
        status: run.status,
        endedAt: run.endedAt,
      }),
    );

    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /metrics/:id ──────────────────────────────────────────────────────────
app.get('/metrics/:id', async (req: Request, res: Response) => {
  try {
    const result = await es.get({ index: INDEX, id: req.params.id });
    res.json({ id: result._id, ...(result._source as object) });
  } catch (err: any) {
    if (err.meta?.statusCode === 404) res.status(404).json({ error: 'Metric not found' });
    else res.status(500).json({ error: err.message });
  }
});

// ── POST /metrics — ingestió + broadcast WebSocket ───────────────────────────
app.post('/metrics', async (req: Request, res: Response) => {
  try {
    const id = uuidv4();
    const body = {
      ...req.body,
      timestamp: req.body.timestamp || new Date().toISOString(),
    };
    await es.index({ index: INDEX, id, body });

    // Broadcast als subscriptors live d'aquest run
    if (body.runId) broadcast(body.runId, { id, ...body });

    res.status(201).json({ id, ...body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /metrics/:id ──────────────────────────────────────────────────────────
app.put('/metrics/:id', async (req: Request, res: Response) => {
  try {
    await es.index({ index: INDEX, id: req.params.id, body: req.body });
    res.json({ id: req.params.id, ...req.body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /metrics/:id ───────────────────────────────────────────────────────
app.delete('/metrics/:id', async (req: Request, res: Response) => {
  try {
    await es.delete({ index: INDEX, id: req.params.id });
    res.status(204).send();
  } catch (err: any) {
    if (err.meta?.statusCode === 404) res.status(404).json({ error: 'Metric not found' });
    else res.status(500).json({ error: err.message });
  }
});

// ── DELETE /metrics/all ───────────────────────────────────────────────────────
// Nuke the entire async-metrics index. Used by the "Reinicia tot" button on
// the Execucions page to reset history to zero in one shot. No archive, no
// undo: samples are gone the moment this returns. The index is recreated
// automatically on the next POST /metrics.
app.delete('/metrics/all', async (_req: Request, res: Response) => {
  try {
    const result = await es.deleteByQuery({
      index: INDEX,
      refresh: true,
      body: { query: { match_all: {} } },
    });
    res.json({ deleted: (result as any).deleted ?? 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /metrics/run/:runId ────────────────────────────────────────────────
// Deletes ALL metric snapshots that belong to a given runId. Used by the UI
// when the user deletes a history row that was only known to Elasticsearch
// (the orchestrator forgot it because its in-memory map was cleared on a
// pod restart). Without this, such rows could not be deleted at all.
app.delete('/metrics/run/:runId', async (req: Request, res: Response) => {
  try {
    const result = await es.deleteByQuery({
      index: INDEX,
      refresh: true,
      body: { query: { match: { runId: req.params.runId } } },
    });
    res.json({ deleted: (result as any).deleted ?? 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3004;
httpServer.listen(PORT, () => console.log(`metrics-api listening on port ${PORT}`));
