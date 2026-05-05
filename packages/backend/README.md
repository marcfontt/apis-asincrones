# backend

Backend **Backstage** de la plataforma. Actua com a proxy centralitzat i
carregador de plugins que proporcionen les funcionalitats base: auth, catalog,
search, scaffolder, techdocs, signals, i permission control.

## Què fa

- **Proxy**: reenvía requests a `/api/proxy/*` als serveis reals
  (catalog-service, scenario-service, benchmark-orchestrator, metrics-api).
- **Auth**: gestiona autenticació via Passport (guest provider por defecte).
- **Catalog**: indexa components del catàleg.
- **Search**: indexa i busca entitats del catàleg.
- **Scaffolder**: crea projectes nova (templates de GitHub).
- **TechDocs**: serveix documentació markdown.
- **Signals**: WebSocket per notificacions en temps real.
- **Permissions**: control d'accés basat en rols.

## Plugins carregats

```ts
// Core
app-backend             // Serveix l'app frontend
proxy-backend           // Proxy /api/proxy/*

// Auth
auth-backend            // Passport + guest provider

// Catalog
catalog-backend         // Indexa entities
catalog-module-logs     // Logs de errors

// Search
search-backend          // Motor de busca

// Scaffolder
scaffolder-backend      // Templates
scaffolder-github       // GitHub module

// TechDocs
techdocs-backend        // Markdown → HTML

// Permissions
permission-backend      // Control d'accés
permission-allow-all    // Policy permissiva (dev)

// Kubernetes
kubernetes-backend      // Info de clusters K8s

// Signals
signals-backend         // Notificacions WebSocket

// Notifications
notifications-backend   // Notificacions

// Org
org-backend             // Entitats org/teams
```

## Engegada en local

```bash
yarn install
yarn workspace backend start
```

Arrenca a **http://localhost:7007** per defecte.

## Proxy a serveis

A `app-config.yaml`, configura les rutes proxy:

```yaml
proxy:
  '/catalog-service':
    target: 'http://localhost:3001'
  '/scenario-service':
    target: 'http://localhost:3002'
  '/benchmark-orchestrator':
    target: 'http://localhost:3003'
  '/metrics-api':
    target: 'http://localhost:3004'
```

## Autenticació

Per defecte usa **guest provider** (sense logins). Per afegir GitHub:

```ts
backend.add(import('@backstage/plugin-auth-backend-module-github-provider'));
```

Configura a `app-config.yaml`:

```yaml
auth:
  providers:
    github:
      development:
        clientId: '...'
        clientSecret: '...'
```

## Catalog & Search

Usa Elasticsearch per indexar components. Configurar a `app-config.yaml`:

```yaml
catalog:
  locations:
    - type: url
      target: http://localhost:3001/components

search:
  elasticsearch:
    provider: pg   # o 'elasticsearch'
```

## Variables d'entorn

| Variable | Defecte |
|----------|---------|
| `PORT` | `7007` |
| `LOG_LEVEL` | `info` |
| `ELASTICSEARCH_URL` | N/A (usa BD via plugin) |

## Tests

```bash
yarn workspace backend test
```

## Documentació

- [Backstage Backend System](https://backstage.io/docs/backend-system)
- [Creating Backends](https://backstage.io/docs/backend-system/building-backends)
- [Plugin Development](https://backstage.io/docs/plugins/structure-of-a-plugin)
