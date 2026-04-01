import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Client } from '@elastic/elasticsearch';
import { v4 as uuidv4 } from 'uuid';

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
      body: { query, size: 1000, sort: [{ timestamp: { order: 'asc' } }] },
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
          size: 1000,
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

// ── GET /metrics/summary — agregació per escenari ────────────────────────────
// Retorna avg latency, throughput, errorRate agrupat per scenarioId
app.get('/metrics/summary', async (req: Request, res: Response) => {
  try {
    const result = await es.search({
      index: INDEX,
      body: {
        size: 0,
        aggs: {
          by_scenario: {
            terms: { field: 'scenarioId.keyword', size: 50 },
            aggs: {
              avg_latency:    { avg: { field: 'latency' } },
              avg_throughput: { avg: { field: 'throughput' } },
              avg_error_rate: { avg: { field: 'errorRate' } },
              architecture:   { terms: { field: 'architecture.keyword', size: 1 } },
              protocol:       { terms: { field: 'protocol.keyword', size: 1 } },
              broker:         { terms: { field: 'broker.keyword', size: 1 } },
            },
          },
        },
      },
    });

    const buckets = (result.aggregations?.by_scenario as any)?.buckets ?? [];
    const summary = buckets.map((b: any) => ({
      scenarioId:    b.key,
      count:         b.doc_count,
      avgLatency:    b.avg_latency?.value,
      avgThroughput: b.avg_throughput?.value,
      avgErrorRate:  b.avg_error_rate?.value,
      architecture:  b.architecture?.buckets?.[0]?.key,
      protocol:      b.protocol?.buckets?.[0]?.key,
      broker:        b.broker?.buckets?.[0]?.key,
    }));

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

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3004;
httpServer.listen(PORT, () => console.log(`metrics-api listening on port ${PORT}`));
