# metrics-api

Microservei que **ingesta i serveix les mètriques** dels benchmarks.
És la cara visible d'Elasticsearch per a la resta del sistema:

- El **load-generator** li puja snapshots cada 5s via `POST /metrics`.
- El **portal** li demana mètriques via `GET /metrics?runId=X` i
  `GET /metrics/summary` (agregat).
- A més obre un **WebSocket** que fa broadcast de cada mètrica nova als
  subscriptors d'aquell `runId`.

## API REST

| Mètode  | Ruta                         | Descripció                              |
|---------|------------------------------|-----------------------------------------|
| GET     | `/health`                    | Healthcheck                             |
| GET     | `/metrics`                   | Filtre per query: runId, scenarioId, ... |
| GET     | `/metrics/summary`           | Agregat per run (top_hits del darrer doc) |
| GET     | `/metrics/compare`           | Comparativa per `scenarioIds=a,b,c`     |
| GET     | `/metrics/:id`               | Detall d'una mostra                     |
| POST    | `/metrics`                   | Ingesta + broadcast WebSocket           |
| PUT     | `/metrics/:id`               | Substitueix una mostra                  |
| DELETE  | `/metrics/:id`               | Elimina una mostra                      |
| DELETE  | `/metrics/all`               | **Esborra tot l'índex**                 |
| DELETE  | `/metrics/run/:runId`        | Esborra totes les mostres d'un runId    |

## WebSocket

Els clients es subscriuen amb:

```json
{ "action": "subscribe", "runId": "abc123" }
```

i reben events:

```json
{ "event": "metric", "data": { ... } }
```

## Per què hi ha scroll a `GET /metrics`

Per defecte, Elasticsearch limita els resultats d'una sola search a
10.000 docs (`index.max_result_window`). Per als benchmarks llargs ens
quedavem curts; per això:

1. Augmentem el límit a 1.000.000 al crear l'índex (`inicialitzarIndexMostres`).
2. La consulta `/metrics` fa servir l'API de **scroll** per paginar en
   blocs de 5.000 fins esgotar els resultats. El client sempre rep
   totes les mostres existents.

## Mapping i percentils

Els documents desats venen del `load-generator` i contenen:

```ts
{
  runId: string,
  scenarioId: string,
  architecture: string, protocol: string, platform: string, dataFormat: string,
  latency: number,           // mitjana cumulativa (ms)
  throughput: number,        // mitjana cumulativa (msg/s)
  errorRate: number,
  p50_latency_ms: number,
  p95_latency_ms: number,
  p99_latency_ms: number,
  messages_sent: number,     // monotonic
  messages_recv: number,     // monotonic
  status: 'running' | 'completed' | 'failed',
  timestamp: string,
}
```

`/metrics/summary` agrupa per `runId` i agafa el **darrer** document
(no fa mitjana), perquè cada doc ja és una mitjana cumulativa i
fer-ne mitjana de mitjanes biaixaria el resultat.

## Entorn

| Variable             | Defecte                        |
|----------------------|--------------------------------|
| `PORT`               | `3004`                         |
| `ELASTICSEARCH_URL`  | `http://elasticsearch:9200`    |
