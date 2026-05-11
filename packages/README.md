# `packages/` - Microserveis i app Backstage

Aquest directori conté l'app Backstage i els serveis que fan funcionar el
benchmark.

## Mapa ràpid

| Carpeta | Funció | Port |
|---------|--------|------|
| `app/` | Frontend Backstage | 3000 |
| `backend/` | Backend Backstage i proxy | 7007 |
| `catalog-service/` | Catàleg de components | 3001 |
| `scenario-service/` | CRUD d'escenaris | 3002 |
| `benchmark-orchestrator/` | Crea Jobs de Kubernetes | 3003 |
| `metrics-api/` | Desa i serveix mètriques | 3004 |
| `load-generator/` | Genera carrega dins un Job | Job |

## Com es connecten

```text
Navegador
  -> app
  -> backend Backstage
  -> catalog-service
  -> scenario-service
  -> benchmark-orchestrator
  -> metrics-api
```

Quan es llança una execució, `benchmark-orchestrator` crea un Job amb el
`load-generator`. El Job envia mostres a `metrics-api`, i `metrics-api`
les desa a Elasticsearch.

## Execucio local

```bash
corepack yarn install --immutable
corepack yarn start
```

Els microserveis de benchmark normalment es despleguen a AKS amb Docker i
Kubernetes. Vegeu `k8s/README.md` i `deploy-all.sh`.

## Convencions

- TypeScript a tot el monorepo.
- Codi clar abans que expressions massa comprimides.
- Comentaris curts quan expliquen una regla important.
- Noms tècnics d'API en anglès si formen part del contracte.
- Text visible del portal traduït al sistema d'i18n.
