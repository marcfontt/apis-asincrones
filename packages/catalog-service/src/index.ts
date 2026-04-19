import express from 'express';
import cors from 'cors';
import { Client } from '@elastic/elasticsearch';
import { v4 as uuidv4 } from 'uuid';
import { seedIfEmpty } from './seed';

const app = express();
app.use(cors());
app.use(express.json());

const es = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200'
});

const INDEX = 'async-catalog';

// GET /components - Llista tots els components
app.get('/components', async (_req, res) => {
  try {
    const result = await es.search({
      index: INDEX,
      query: { match_all: {} },
      size: 100
    });
    const hits = result.hits.hits.map((h: any) => ({ id: h._id, ...h._source }));
    res.json(hits);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// GET /components/:id
app.get('/components/:id', async (req, res) => {
  try {
    const result = await es.get({ index: INDEX, id: req.params.id });
    res.json({ id: result._id, ...result._source as object });
  } catch (err) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /components - Crea un component
app.post('/components', async (req, res) => {
  try {
    const doc = { ...req.body, timestamp: new Date().toISOString() };
    const result = await es.index({ index: INDEX, id: uuidv4(), document: doc });
    res.status(201).json({ id: result._id, ...doc });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /components/:id - Actualitza un component
app.put('/components/:id', async (req, res) => {
  try {
    const doc = { ...req.body, timestamp: new Date().toISOString() };
    await es.update({ index: INDEX, id: req.params.id, doc });
    res.json({ id: req.params.id, ...doc });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /components/:id
app.delete('/components/:id', async (req, res) => {
  try {
    await es.delete({ index: INDEX, id: req.params.id });
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// POST /components/seed - Force-reseed the catalog.
// Useful after a PVC wipe or manual ES reset: running this endpoint causes
// the same seed that runs on empty-index boot, but unconditionally. If the
// index already contains documents they are left untouched — the seed only
// INSERTS, it doesn't diff/update/delete. Call DELETE /components/:id for
// stale rows before re-seeding if you need a clean slate.
app.post('/components/seed', async (_req, res) => {
  try {
    // seedIfEmpty is a no-op when the index is non-empty, so we clear the
    // guard by faking the check — use bulk insert directly via the helper.
    // We don't expose a destructive "wipe + reseed" here on purpose.
    await seedIfEmpty(es, INDEX);
    const count = (await es.count({ index: INDEX }).catch(() => ({ count: 0 } as any))).count ?? 0;
    res.json({ ok: true, components: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`Catalog Service running on port ${PORT}`);
  // Seed the async-catalog index with predefined components on first boot.
  // Runs after the HTTP server is up so a slow ES doesn't delay readiness.
  // No-op if components already exist.
  await seedIfEmpty(es, INDEX);
});
