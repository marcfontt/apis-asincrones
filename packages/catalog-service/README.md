# catalog-service

Microservei que gestiona el **catàleg de components** del benchmark:
arquitectures, protocols i plataformes que es poden combinar per
construir un escenari.

## Què fa

- Persisteix els components a Elasticsearch (índex `async-catalog`).
- Sincronitza l'índex amb el seed predefinit cada vegada que arrenca
  (vegeu `src/seed.ts`). Només afegeix els components que falten; no
  esborra ni sobreescriu files existents.
- Exposa una API REST amb CRUD complet sobre `/components`.
- El seed actual inclou cinc arquitectures: `SEA`, `LCA`, `EMA`, `EDA`
  i `QBA`.
- Versions fixades al codi: Kafka `4.1.1`, RabbitMQ `3.13` i NATS
  Server `2.12.5`.
- El valor intern `Confluent` apunta al servei Redpanda/Kafka-compatible
  del clúster. No es mostra com a Confluent Platform perquè el repositori
  no desplega Confluent real.

## API

| Mètode | Ruta                   | Descripció                          |
|--------|------------------------|-------------------------------------|
| GET    | `/health`              | Healthcheck                         |
| GET    | `/components`          | Llista tots els components          |
| GET    | `/components/:id`      | Detall d'un component               |
| POST   | `/components`          | Crea un component                   |
| PUT    | `/components/:id`      | Actualitza                          |
| DELETE | `/components/:id`      | Elimina (només els no predefinits)  |
| POST   | `/components/seed`     | Sincronitza components predefinits  |

## Model de dades

```ts
{
  shortName: string,            // 'EDA', 'Kafka', 'MQTT', ...
  name: string,                 // 'Event-Driven Architecture'
  category: 'architecture' | 'protocol' | 'platform',
  description: string,          // Descripció en català
  version?: string,             // Versió coneguda (4.1.1, 0.9.1, ...)
  tags?: string[],              // Etiquetes lliures
  predefined?: boolean,         // true = ve del seed, no es pot esborrar
  createdAt: string,            // ISO timestamp
}
```

## Entorn

| Variable             | Defecte                        |
|----------------------|--------------------------------|
| `PORT`               | `3001`                         |
| `ELASTICSEARCH_URL`  | `http://elasticsearch:9200`    |

## Engegada en local

```bash
yarn install
yarn workspace catalog-service start
```

Per defecte connecta a `http://localhost:9200` (canvia
`ELASTICSEARCH_URL` si tens ES en un altre lloc).
