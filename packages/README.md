# `packages/` - App i microserveis

Aquest directori conté el frontend de Backstage, el backend de Backstage i els microserveis que fan possible el benchmark.

## Mapa ràpid

| Carpeta | Servei | Port | Responsabilitat |
|---|---|---:|---|
| `app/` | Backstage frontend | 3000 | Interfície web, tema, navegació i i18n. |
| `backend/` | Backstage backend | 7007 | Serveix l'app i fa proxy cap als microserveis. |
| `catalog-service/` | Catalog Service | 3001 | Components: arquitectures, protocols i plataformes. |
| `scenario-service/` | Scenario Service | 3002 | Escenaris configurables i estat bàsic. |
| `benchmark-orchestrator/` | Benchmark Orchestrator | 3003 | Cua, control de concurrència i Jobs de Kubernetes. |
| `metrics-api/` | Metrics API | 3004 | Ingesta, WebSocket i consulta de mètriques. |
| `load-generator/` | Load Generator | Job | Publica i consumeix missatges durant cada run. |

## Flux entre paquets

```text
Navegador
  -> app
  -> backend Backstage
  -> /api/proxy/catalog-service
  -> /api/proxy/scenario-service
  -> /api/proxy/benchmark-orchestrator
  -> /api/proxy/metrics-api
```

Quan s'executa un escenari, el `benchmark-orchestrator` crea un Job amb el `load-generator`. El Job escriu snapshots a `metrics-api` i `metrics-api` els desa a Elasticsearch.

## Execució local

```bash
corepack yarn install --immutable
corepack yarn start
```

Els brokers i els Jobs de càrrega s'executen normalment a AKS. En local, el portal pot arrencar, però les proves reals necessiten serveis accessibles i les variables d'entorn configurades.

## Convencions

- TypeScript a tot el monorepo.
- Codi clar i explícit, sense expressions compactes difícils de seguir.
- Comentaris només quan expliquen una regla de negoci o una decisió operativa.
- Noms tècnics en anglès quan formen part del contracte d'API.
- Text visible del portal dins del sistema d'i18n.
