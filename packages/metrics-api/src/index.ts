import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Client } from '@elastic/elasticsearch';
import { v4 as uuidv4 } from 'uuid';
import { buildExactMetricQuery, exactKeywordTerm } from './elasticQueries';
import { shouldIncludeRunInHistory } from './historySummary';

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const es = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200' });
const INDEX = 'async-metrics';
let metricsIndexInitialized = false;
let metricsIndexInitPromise: Promise<void> | null = null;

// ── Inicialitzacio de l'index a Elasticsearch ─────────────────────────────────
// Per defecte ES limita els resultats d'una sola search a 10.000 documents
// (`index.max_result_window`). Els nostres benchmarks llargs poden acumular
// molts mes punts de mostra, per tant pujem aquest limit a 1.000.000.
// La consulta /metrics tambe pagina amb scroll per si encara cal mes.
//
// Aquesta funcio es idempotent: si l'index ja existeix nomes intenta
// actualitzar la configuracio. Si falla per qualsevol motiu (permisos,
// version mismatch...), nomes registrem un avis: la API segueix funcionant
// pero amb el limit per defecte, cosa que no trenca res.
async function initializeMetricsIndex(): Promise<void> {
  try {
    const existeix = await es.indices.exists({ index: INDEX });
    if (!existeix) {
      await es.indices.create({
        index: INDEX,
        body: { settings: { 'index.max_result_window': 1_000_000 } },
      });
      console.log(`[metrics-api] index "${INDEX}" creat amb max_result_window=1.000.000`);
    } else {
      await es.indices.putSettings({
        index: INDEX,
        body: { 'index.max_result_window': 1_000_000 },
      });
      console.log(`[metrics-api] index "${INDEX}" ja existia, max_result_window ajustat a 1.000.000`);
    }
    metricsIndexInitialized = true;
  } catch (err: any) {
    console.warn(`[metrics-api] no s'ha pogut ajustar max_result_window: ${err?.message || err}`);
  }
}

async function ensureMetricsIndexInitialized(): Promise<void> {
  if (metricsIndexInitialized) {
    return;
  }

  if (!metricsIndexInitPromise) {
    metricsIndexInitPromise = initializeMetricsIndex().finally(() => {
      metricsIndexInitPromise = null;
    });
  }

  await metricsIndexInitPromise;
}

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
//
// Retorna totes les mostres que coincideixen amb els filtres demanats.
// La paginacio per defecte d'Elasticsearch te un sostre dur (10.000), pero
// en aquest projecte volem mostres "il·limitades" perquè un benchmark llarg
// pot acumular molts mes punts. Per aixo:
//   1. Pujem `index.max_result_window` a 100.000 al crear l'index.
//   2. Si l'usuari demana mes, fem servir la API de scroll per anar-ho
//      paginant en blocs de 5.000 fins esgotar els resultats.
//
// Aixo elimina el sostre artificial de 10.000 mostres que confonia
// l'usuari (li semblava que algunes execucions perdien dades).
//
// Query params suportats: runId, architecture, protocol, broker, platform,
// gateway, scenarioId, dataFormat, status.
const TAMANY_PAGINA = 5_000;

app.get('/metrics', async (req: Request, res: Response) => {
  try {
    const query = buildExactMetricQuery(req.query);

    // Primera pagina amb scroll obert (1 minut de TTL).
    let resposta: any = await es.search({
      index: INDEX,
      scroll: '1m',
      body: { query, size: TAMANY_PAGINA, sort: [{ timestamp: { order: 'asc' } }] },
    });

    let hits: any[] = (resposta.hits?.hits ?? []).map((h: any) => ({ id: h._id, ...h._source }));
    let scrollId: string | undefined = resposta._scroll_id;

    // Continuem fins que ES ens deixi de tornar mostres.
    while (scrollId && resposta.hits?.hits?.length === TAMANY_PAGINA) {
      resposta = await es.scroll({ scroll_id: scrollId, scroll: '1m' });
      const noves = (resposta.hits?.hits ?? []).map((h: any) => ({ id: h._id, ...h._source }));
      hits = hits.concat(noves);
      scrollId = resposta._scroll_id;
      // Petit fre de seguretat: no acumulem mai mes d'1M de docs en memoria.
      if (hits.length >= 1_000_000) break;
    }

    // Tanquem el cursor de scroll explicitament per alliberar recursos a ES.
    if (scrollId) {
      try { await es.clearScroll({ scroll_id: scrollId }); } catch { /* best effort */ }
    }

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
      // Usem la mateixa estrategia de scroll que GET /metrics per no
      // perdre mostres en escenaris amb moltes execucions acumulades.
      let resp: any = await es.search({
        index: INDEX,
        scroll: '1m',
        body: {
          query: buildExactMetricQuery({ scenarioId: sid }),
          size: TAMANY_PAGINA,
          sort: [{ timestamp: { order: 'asc' } }],
        },
      });
      let hitsAcc: any[] = (resp.hits?.hits ?? []).map((h: any) => ({ id: h._id, ...h._source }));
      let scrollId: string | undefined = resp._scroll_id;
      while (scrollId && resp.hits?.hits?.length === TAMANY_PAGINA) {
        resp = await es.scroll({ scroll_id: scrollId, scroll: '1m' });
        const noves = (resp.hits?.hits ?? []).map((h: any) => ({ id: h._id, ...h._source }));
        hitsAcc = hitsAcc.concat(noves);
        scrollId = resp._scroll_id;
        if (hitsAcc.length >= 1_000_000) break;
      }
      if (scrollId) {
        try { await es.clearScroll({ scroll_id: scrollId }); } catch { /* best effort */ }
      }
      results[sid] = hitsAcc;
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
    // Elasticsearch retorna les agregacions `composite` per pagines.
    // Guardem tots els "buckets" en una llista amb un nom explicatiu perquè
    // sigui clar que cada bucket representa una execució (`runId`).
    const cubosPorEjecucion: any[] = [];
    let claveSiguientePagina: Record<string, unknown> | undefined;

    do {
      const resultadoBusqueda = await es.search({
        index: INDEX,
        body: {
          size: 0,
          aggs: {
            by_run: {
              composite: {
                size: 500,
                sources: [
                  { runId: { terms: { field: 'runId.keyword' } } },
                ],
                ...(claveSiguientePagina ? { after: claveSiguientePagina } : {}),
              },
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
                      'errorCode', 'errorDetail', 'natsMaxPayloadBytes',
                    ],
                  },
                },
                // min/max timestamp per run so the UI can time-filter history
                // against real run boundaries instead of guessing via last sample.
                started_at: { min: { field: 'timestamp' } },
                ended_at: { max: { field: 'timestamp' } },
              },
            },
          },
        },
      });

      const agregacionPorEjecucion = resultadoBusqueda.aggregations?.by_run as any;
      cubosPorEjecucion.push(...(agregacionPorEjecucion?.buckets ?? []));
      claveSiguientePagina = agregacionPorEjecucion?.after_key;
    } while (claveSiguientePagina);

    const resumenEjecuciones = cubosPorEjecucion.map((cuboEjecucion: any) => {
      // Pull the final cumulative snapshot for this run. All per-run stats
      // are read from here (see block comment above for the rationale).
      const ultimaMuestra = cuboEjecucion.last_doc?.hits?.hits?.[0]?._source ?? {};
      return {
        runId:         typeof cuboEjecucion.key === 'object' ? cuboEjecucion.key.runId : cuboEjecucion.key,
        scenarioId:    ultimaMuestra.scenarioId,
        // `count` keeps backwards compatibility with the old UI contract:
        // real messages received (monotonic counter). Falls back to the
        // snapshot-doc count only if the field is missing (very old data).
        count:         ultimaMuestra.messages_recv ?? cuboEjecucion.doc_count,
        // `pointCount` / `measureCount` represent telemetry documents for
        // this run. The history UI uses this to show accumulated measures
        // instead of confusing them with delivered messages.
        pointCount:    cuboEjecucion.doc_count,
        measureCount:  cuboEjecucion.doc_count,
        messagesSent:  ultimaMuestra.messages_sent ?? null,
        messagesRecv:  ultimaMuestra.messages_recv ?? null,
        // Cumulative averages from the FINAL snapshot, not avg-of-avgs.
        avgLatency:    ultimaMuestra.latency,
        avgThroughput: ultimaMuestra.throughput_stable ?? ultimaMuestra.throughput,
        avgErrorRate:  ultimaMuestra.errorRate,
        // Percentiles computed per-run by the load-generator over its
        // post-warm-up latency array. Already the correct per-run answer.
        p50Latency:    ultimaMuestra.p50_latency_ms,
        p95Latency:    ultimaMuestra.p95_latency_ms,
        p99Latency:    ultimaMuestra.p99_latency_ms,
        architecture:  ultimaMuestra.architecture,
        protocol:      ultimaMuestra.protocol,
        broker:        ultimaMuestra.broker,
        platform:      ultimaMuestra.platform,
        dataFormat:    ultimaMuestra.dataFormat,
        deliveryModel: ultimaMuestra.deliveryModel,
        errorCode:     ultimaMuestra.errorCode,
        errorDetail:   ultimaMuestra.errorDetail,
        natsMaxPayloadBytes: ultimaMuestra.natsMaxPayloadBytes,
        status:        ultimaMuestra.status,
        // ISO strings preferred over epoch ms so the UI can Date.parse() directly
        startedAt:     cuboEjecucion.started_at?.value_as_string ?? (cuboEjecucion.started_at?.value != null ? new Date(cuboEjecucion.started_at.value).toISOString() : null),
        endedAt:       cuboEjecucion.ended_at?.value_as_string   ?? (cuboEjecucion.ended_at?.value   != null ? new Date(cuboEjecucion.ended_at.value).toISOString()   : null),
      };
    }).filter((run: { status?: unknown; endedAt?: string | null }) =>
      shouldIncludeRunInHistory({
        status: run.status,
        endedAt: run.endedAt,
      }),
    );

    res.json(resumenEjecuciones);
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
    await ensureMetricsIndexInitialized();
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
      body: { query: exactKeywordTerm('runId', req.params.runId) ?? { match_none: {} } },
    });
    res.json({ deleted: (result as any).deleted ?? 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3004;
httpServer.listen(PORT, async () => {
  console.log(`metrics-api listening on port ${PORT}`);
  // Cridem la inicialitzacio sense bloquejar l'arrencada del servidor.
  // Si Elasticsearch encara no esta llest, ja ho tornarem a intentar al
  // primer POST /metrics; aixi els clients no es queden penjats.
  initializeMetricsIndex();
});
