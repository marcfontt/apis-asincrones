# `scenario-service`

Microservei que gestiona els escenaris del benchmark. Un escenari és una combinació d'arquitectura, protocol, plataforma, format de dades, durada, ràtio i payload.

## Què fa

- Persisteix escenaris a Elasticsearch a l'índex `async-scenarios`.
- Exposa CRUD sobre `/scenarios`.
- Desa l'estat funcional que veu la UI.
- Permet que l'orquestrador actualitzi l'estat quan un run canvia.

## Estats

| Estat intern | Lectura al portal |
|---|---|
| `idle` | Llest. |
| `pending` | Pendent d'executar. |
| `running` | En execució. |
| `completed` | Completat. |
| `failed` | Fallit. |
| `cancelled` | Cancel·lat. |

Si un escenari queda pendent, encara no ha creat Job i no ha de tenir mètriques.

## API

| Mètode | Ruta | Descripció |
|---|---|---|
| GET | `/health` | Healthcheck. |
| GET | `/scenarios` | Llista escenaris. |
| GET | `/scenarios/:id` | Detall. |
| POST | `/scenarios` | Crea un escenari. |
| PUT | `/scenarios/:id` | Substitueix un escenari. |
| PATCH | `/scenarios/:id` | Actualitza camps concrets. |
| DELETE | `/scenarios/:id` | Elimina un escenari. |

## Model

```ts
{
  id: string,
  name: string,
  architecture: string,
  protocol: string,
  platform: string,
  dataFormat: string,
  duration: number | null,
  rate: number | null,
  payloadSize: number | null,
  status: string,
  currentRunId?: string,
  createdAt: string,
}
```

## Entorn

| Variable | Defecte |
|---|---|
| `PORT` | `3002` |
| `ELASTICSEARCH_URL` | `http://elasticsearch:9200` |
