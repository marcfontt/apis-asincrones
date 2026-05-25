# `catalog-service`

Microservei que gestiona el catàleg de components del benchmark: arquitectures, protocols i plataformes.

## Què fa

- Persisteix components a Elasticsearch a l'índex `async-catalog`.
- Sincronitza el seed predefinit cada vegada que arrenca.
- Afegeix components que falten sense esborrar ni sobreescriure els existents.
- Exposa CRUD sobre `/components`.
- Bloqueja l'eliminació de components predefinits.

## Seed actual

| Categoria | Components |
|---|---|
| Arquitectura | EDA, QBA, LCA, EMA, SEA |
| Protocol | Kafka, AMQP, MQTT, NATS, gRPC, WebSocket |
| Plataforma | Apache Kafka, Confluent, RabbitMQ, NATS Server |

SEA vol dir Serverless Event Architecture.

Confluent apareix com a plataforma pròpia perquè és útil per a la comparació del portal, però en aquesta fase s'executa pel camí Kafka-compatible del clúster. No s'estan mesurant Schema Registry, ksqlDB ni Control Center.

## API

| Mètode | Ruta | Descripció |
|---|---|---|
| GET | `/health` | Healthcheck. |
| GET | `/components` | Llista components. |
| GET | `/components/:id` | Retorna un component. |
| POST | `/components` | Crea un component. |
| PUT | `/components/:id` | Actualitza un component. |
| DELETE | `/components/:id` | Elimina components no predefinits. |
| POST | `/components/seed` | Força la sincronització del seed. |

## Model

```ts
{
  id: string,
  shortName: string,
  name: string,
  category: 'architecture' | 'protocol' | 'platform',
  description: string,
  version?: string,
  tags?: string[],
  predefined?: boolean,
  createdAt: string,
}
```

## Entorn

| Variable | Defecte |
|---|---|
| `PORT` | `3001` |
| `ELASTICSEARCH_URL` | `http://elasticsearch:9200` |

## Engegada local

```bash
corepack yarn workspace catalog-service build
corepack yarn workspace catalog-service start
```

Per executar en mode desenvolupament:

```bash
corepack yarn workspace catalog-service dev
```
