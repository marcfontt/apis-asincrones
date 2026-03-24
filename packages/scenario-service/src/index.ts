import express, { Request, Response } from 'express';
import { Client } from '@elastic/elasticsearch';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

const es = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200' });
const INDEX = 'async-scenarios';

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'scenario-service' });
});

app.get('/scenarios', async (_req: Request, res: Response) => {
  try {
    const result = await es.search({ index: INDEX, body: { query: { match_all: {} }, size: 100 } });
    const hits = (result.hits?.hits ?? []).map((h: any) => ({ id: h._id, ...h._source }));
    res.json(hits);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/scenarios/:id', async (req: Request, res: Response) => {
  try {
    const result = await es.get({ index: INDEX, id: req.params.id });
    res.json({ id: result._id, ...(result._source as object) });
  } catch (err: any) {
    if (err.meta?.statusCode === 404) res.status(404).json({ error: 'Scenario not found' });
    else res.status(500).json({ error: err.message });
  }
});

app.post('/scenarios', async (req: Request, res: Response) => {
  try {
    const id = uuidv4();
    const body = { ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await es.index({ index: INDEX, id, body });
    res.status(201).json({ id, ...body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/scenarios/:id', async (req: Request, res: Response) => {
  try {
    const body = { ...req.body, updatedAt: new Date().toISOString() };
    await es.index({ index: INDEX, id: req.params.id, body });
    res.json({ id: req.params.id, ...body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /scenarios/:id — actualització parcial (status, currentRunId, etc.)
app.patch('/scenarios/:id', async (req: Request, res: Response) => {
  try {
    const current = await es.get({ index: INDEX, id: req.params.id });
    const merged = { ...(current._source as object), ...req.body, updatedAt: new Date().toISOString() };
    await es.index({ index: INDEX, id: req.params.id, body: merged });
    res.json({ id: req.params.id, ...merged });
  } catch (err: any) {
    if (err.meta?.statusCode === 404) res.status(404).json({ error: 'Scenario not found' });
    else res.status(500).json({ error: err.message });
  }
});

app.delete('/scenarios/:id', async (req: Request, res: Response) => {
  try {
    await es.delete({ index: INDEX, id: req.params.id });
    res.status(204).send();
  } catch (err: any) {
    if (err.meta?.statusCode === 404) res.status(404).json({ error: 'Scenario not found' });
    else res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`scenario-service listening on port ${PORT}`));
