# `plugins/` - Plugins Backstage del portal

Aquest directori conté el plugin propi `async-benchmark`. Tot el que
l'usuari veu a Home, Catàleg, Escenaris, Execucions i Resultats surt
d'aquest plugin.

## Estructura

```text
async-benchmark/
├── src/
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── CatalogPage.tsx
│   │   ├── ScenariosPage.tsx
│   │   ├── ExecucionsPage.tsx
│   │   └── ResultatsPage.tsx
│   ├── components/
│   │   ├── FilterPanel.tsx
│   │   ├── GuidePanel.tsx
│   │   ├── TutorialOverlay.tsx
│   │   └── CompatibilityMatrix.tsx
│   ├── shared/
│   ├── theme.ts
│   ├── plugin.ts
│   └── index.ts
└── README.md
```

## Connexió amb el backend

El plugin no crida directament els microserveis. Sempre passa pel proxy de
Backstage configurat a `app-config.yaml`.

```text
Plugin React
  -> /api/proxy/catalog-service
  -> /api/proxy/scenario-service
  -> /api/proxy/benchmark-orchestrator
  -> /api/proxy/metrics-api
```

Això evita CORS al navegador i manté les URLs internes fora del frontend.

## Convencions

- Els textos visibles han d'estar traduïts a català, castellà i anglès.
- Els filtres han d'usar `FilterPanel`.
- Les guies han d'usar `GuidePanel`.
- Els tutorials han d'usar `TutorialOverlay` i han de representar la pàgina real.
- La compatibilitat ha de venir de `shared/catalog/compatibility.ts`.
