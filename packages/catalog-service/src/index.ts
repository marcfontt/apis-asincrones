import express from 'express';
import cors from 'cors';
import { Client } from '@elastic/elasticsearch';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

const es = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200'
});

const INDEX = 'feina-catalog';

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
app.get('/components/:id', async (_req, res) => {
  try {
    const result = await es.get({ index: INDEX, id: req.params.id });
    res.json({ id: result._id, ...result._source as object });
  } catch (err) {
    res.status(404).json({ error: 'Not found' });
  }
});

// POST /components - Crea un component
app.post('/components', async (_req, res) => {
  try {
    const doc = { ...req.body, timestamp: new Date().toISOString() };
    const result = await es.index({ index: INDEX, id: uuidv4(), document: doc });
    res.status(201).json({ id: result._id, ...doc });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// PUT /components/:id - Actualitza un component
app.put('/components/:id', async (_req, res) => {
  try {
    const doc = { ...req.body, timestamp: new Date().toISOString() };
    await es.update({ index: INDEX, id: req.params.id, doc });
    res.json({ id: req.params.id, ...doc });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// DELETE /components/:id
app.delete('/components/:id', async (_req, res) => {
  try {
    await es.delete({ index: INDEX, id: req.params.id });
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Catalog Service running on port ${PORT}`));
