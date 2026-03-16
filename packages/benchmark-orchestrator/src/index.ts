import express, { Request, Response } from 'express';
import { Client } from '@elastic/elasticsearch';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

const es = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200' });
const INDEX = 'async-benchmarks';

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'benchmark-orchestrator' });
});

// GET /runs
app.get('/runs', async (_req: Request, res: Response) => {
  try {
    const result = await es.search({ index: INDEX, body: { query: { match_all: {} }, size: 100 } });
    const hits = (result.hits?.hits ?? []).map((h: any) => ({ id: h._id, ...h._source }));
    res.json(hits);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /runs/:id
app.get('/runs/:id', async (req: Request, res: Response) => {
  try {
    const result = await es.get({ index: INDEX, id: req.params.id });
    res.json({ id: result._id, ...(result._source as object) });
  } catch (err: any) {
    if (err.meta?.statusCode === 404) res.status(404).json({ error: 'Run not found' });
    else res.status(500).json({ error: err.message });
  }
});

// POST /runs — crea un nou run (status: pending)
app.post('/runs', async (req: Request, res: Response) => {
  try {
    const id = uuidv4();
    const body = {
      ...req.body,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await es.index({ index: INDEX, id, body });
    res.status(201).json({ id, ...body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /runs/:id — actualitza status (pending → running → completed/error)
app.put('/runs/:id', async (req: Request, res: Response) => {
  try {
    const body = { ...req.body, updatedAt: new Date().toISOString() };
    await es.index({ index: INDEX, id: req.params.id, body });
    res.json({ id: req.params.id, ...body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /runs/:id
app.delete('/runs/:id', async (req: Request, res: Response) => {
  try {
    await es.delete({ index: INDEX, id: req.params.id });
    res.status(204).send();
  } catch (err: any) {
    if (err.meta?.statusCode === 404) res.status(404).json({ error: 'Run not found' });
    else res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`benchmark-orchestrator listening on port ${PORT}`));
