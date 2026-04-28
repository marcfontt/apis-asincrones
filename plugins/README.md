# `plugins/` — Plugins Backstage del portal

Aquest directori només conté un plugin propi: `async-benchmark`. Tot el
que veu l'usuari al portal (les 5 pàgines) ve d'aquí.

## `async-benchmark/`

```
async-benchmark/
├── src/
│   ├── pages/
│   │   ├── HomePage.tsx          ← Pàgina inicial + base conceptual
│   │   ├── CatalogPage.tsx       ← Catàleg de components
│   │   ├── ScenariosPage.tsx     ← Definició d'escenaris
│   │   ├── ExecucionsPage.tsx    ← Estat actiu i històric d'execucions
│   │   ├── ResultatsPage.tsx     ← Live + History + comparativa
│   │   └── RunsPage.tsx          ← Vista alternativa
│   ├── components/               ← Components reutilitzables
│   ├── shared/                   ← Helpers (compatibility, metrics, results)
│   ├── theme.ts                  ← Tokens de tema (light + dark)
│   ├── plugin.ts                 ← Registre del plugin a Backstage
│   └── index.ts
├── package.json
└── README.md
```

## Com es connecta amb el backend

El plugin no parla mai directament amb els microserveis: tot va a través
del **proxy de Backstage** (`/api/proxy/...`) configurat a `app-config.yaml`.

```
async-benchmark plugin
       |
       | fetch('/api/proxy/metrics-api/metrics?runId=X')
       v
Backstage backend (proxy)
       |
       v
metrics-api ClusterIP service
```

Això vol dir que el frontend **no necessita** saber les URLs reals dels
microserveis ni gestionar CORS.

## Pàgines

| Ruta                | Component        | Que fa                                    |
|---------------------|------------------|-------------------------------------------|
| `/home`             | HomePage         | Hero + base conceptual + accessos ràpids  |
| `/catalog`          | CatalogPage      | Llista de components + matriu compatibilitats |
| `/escenaris`        | ScenariosPage    | CRUD d'escenaris + execució en lot        |
| `/execucions`       | ExecucionsPage   | Runs actius i històric                    |
| `/resultats`        | ResultatsPage    | Live + History + millor escenari          |

## Convencions de codi

- **Estils inline + variables CSS** definides a `theme.ts`. No fem
  servir cap framework de CSS-in-JS pesat (styled-components, etc.) per
  mantenir el plugin lleuger.
- **Comentaris**: les pàgines són grans (1000–2000 línies); cada secció
  té el seu encapçalament `// ── Nom de la secció ──`.
- **Nomenclatura**: variables locals i funcions privades en català o
  castellà. Tipus exportats i contractes públics en anglès.
