# `plugins/` - Plugins Backstage

Aquest directori conté el plugin propi `async-benchmark`, que és la part visible del portal de proves.

## Plugin actual

| Plugin | Funció |
|---|---|
| `async-benchmark/` | Home, Catàleg, Escenaris, Execucions i Resultats. |

## Connexió amb serveis

El plugin no crida directament URLs internes del clúster. Sempre passa pel proxy de Backstage:

```text
Plugin React
  -> /api/proxy/catalog-service
  -> /api/proxy/scenario-service
  -> /api/proxy/benchmark-orchestrator
  -> /api/proxy/metrics-api
```

Aquest patró evita problemes de CORS i manté els endpoints interns fora del navegador.

## Convencions

- Les guies de pàgina han d'usar `GuidePanel`.
- Els filtres han d'usar `FilterPanel`.
- Els tutorials han d'usar `TutorialOverlay`.
- La compatibilitat ha de sortir de `shared/catalog/compatibility.ts`.
- La reproduïbilitat del catàleg ha de sortir de `shared/catalog/reproducibility.ts`.
- Els textos visibles han d'estar traduïts a català, castellà i anglès.
