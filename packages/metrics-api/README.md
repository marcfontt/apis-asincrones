# `metrics-api`

Microservei que ingesta, persisteix i serveix les mètriques dels benchmarks. És la capa que connecta el `load-generator`, el portal i Elasticsearch.

## Què fa

- Rep snapshots del `load-generator` via `POST /metrics`.
- Desa les mostres a Elasticsearch a l'índex `async-metrics`.
- Serveix consultes filtrades per `runId`, `scenarioId`, plataforma o format.
- Calcula un resum per run amb l'última mostra disponible.
- Emet mètriques noves per WebSocket als clients subscrits.

## API REST

| Mètode | Ruta | Descripció |
|---|---|---|
| GET | `/health` | Healthcheck. |
| GET | `/metrics` | Consulta mostres amb filtres. |
| GET | `/metrics/summary` | Resum per run a partir de l'últim document. |
| GET | `/metrics/compare` | Comparativa per escenaris. |
| GET | `/metrics/:id` | Detall d'una mostra. |
| POST | `/metrics` | Ingesta i broadcast WebSocket. |
| PUT | `/metrics/:id` | Substitueix una mostra. |
| DELETE | `/metrics/:id` | Elimina una mostra. |
| DELETE | `/metrics/all` | Esborra l'índex de mètriques. |
| DELETE | `/metrics/run/:runId` | Esborra les mostres d'un run. |

## WebSocket

Subscriure's a un run:

```json
{ "action": "subscribe", "runId": "rabbitmq-financer-d4eae5" }
```

Resposta esperada quan arriba una mostra:

```json
{ "event": "metric", "data": { "runId": "rabbitmq-financer-d4eae5" } }
```

## Model de mètrica

```ts
{
  runId: string,
  scenarioId: string,
  architecture: string,
  protocol: string,
  platform: string,
  dataFormat: string,
  latency: number,
  throughput: number,
  errorRate: number,
  p50_latency_ms: number,
  p95_latency_ms: number,
  p99_latency_ms: number,
  messages_sent: number,
  messages_recv: number,
  status?: 'running' | 'completed' | 'failed',
  timestamp: string,
}
```

Cada document conté valors acumulats fins aquell moment. Per això `/metrics/summary` agafa l'últim document del run i no fa una mitjana de mitjanes.

## Elasticsearch

El servei prepara l'índex en arrencar i torna a intentar-ho abans del primer `POST /metrics` si Elasticsearch encara no estava llest. La consulta `/metrics` usa paginació per poder recuperar runs llargs sense topar amb el límit habitual de resultats.

## Entorn

| Variable | Defecte |
|---|---|
| `PORT` | `3004` |
| `ELASTICSEARCH_URL` | `http://elasticsearch:9200` |
