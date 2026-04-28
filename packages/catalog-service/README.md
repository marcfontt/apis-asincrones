# catalog-service

Microservei que gestiona el **catàleg de components** del benchmark:
arquitectures, protocols i plataformes que es poden combinar per
construir un escenari.

## Què fa

- Persisteix els components a Elasticsearch (índex `async-catalog`).
- Auto-omple l'índex amb un seed predefinit la primera vegada que
  arrenca (vegeu `src/seed.ts`).
- Exposa una API REST amb CRUD complet sobre `/components`.

## API

| Mètode | Ruta                   | Descripció                          |
|--------|------------------------|-------------------------------------|
| GET    | `/health`              | Healthcheck                         |
| GET    | `/components`          | Llista tots els components          |
| GET    | `/components/:id`      | Detall d'un component               |
| POST   | `/components`          | Crea un component                   |
| PUT    | `/components/:id`      | Actualitza                          |
| DELETE | `/components/:id`      | Elimina (només els no predefinits)  |
| POST   | `/components/seed`     | Reseed manual de l'índex            |

## Model de dades

```ts
{
  shortName: string,            // 'EDA', 'Kafka', 'MQTT', ...
  name: string,                 // 'Event-Driven Architecture'
  category: 'architecture' | 'protocol' | 'platform',
  description: string,          // Descripció en català
  version?: string,             // Versió coneguda (3.7, 0.9.1, ...)
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
