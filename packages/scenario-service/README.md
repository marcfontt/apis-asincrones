# scenario-service

Microservei que gestiona els **escenaris** del benchmark. Un escenari
és una combinació concreta d'arquitectura + protocol + plataforma +
format de dades, amb durada, ratio i mida de payload.

## Què fa

- Persisteix els escenaris a Elasticsearch (índex `async-scenarios`).
- API REST CRUD sobre `/scenarios`.
- Mantén l'estat (`idle`, `running`) que l'orquestrador actualitza
  via PATCH quan llança o atura un run.

## API

| Mètode | Ruta                  | Descripció                                  |
|--------|-----------------------|---------------------------------------------|
| GET    | `/health`             | Healthcheck                                 |
| GET    | `/scenarios`          | Llista tots els escenaris                   |
| GET    | `/scenarios/:id`      | Detall                                      |
| POST   | `/scenarios`          | Crea (genera UUID, posa `status=idle`)      |
| PUT    | `/scenarios/:id`      | Actualitza                                  |
| PATCH  | `/scenarios/:id`      | Patch parcial (usat per l'orquestrador)     |
| DELETE | `/scenarios/:id`      | Elimina                                     |

## Model

```ts
{
  id: string,                   // UUID
  name: string,                 // Nom triat per l'usuari
  architecture: string,         // 'EDA', 'QBA', ...
  protocol: string,             // 'Kafka', 'MQTT', ...
  platform: string,             // 'Apache Kafka', 'NATS Server', ...
  dataFormat: string,           // 'default', 'video-4k', 'iot', ...
  duration: number | null,      // segons (0 o null = indefinit)
  rate: number | null,          // missatges per segon
  payloadSize: number | null,   // bytes
  status: 'idle' | 'running',
  currentRunId?: string,        // runId actiu (només si running)
  createdAt: string,
}
```

## Entorn

| Variable             | Defecte                        |
|----------------------|--------------------------------|
| `PORT`               | `3002`                         |
| `ELASTICSEARCH_URL`  | `http://elasticsearch:9200`    |
