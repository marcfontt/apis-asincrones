# app

Frontend **Backstage** (React) del portal del benchmark. Gestiona la UI per
consultar components del catàleg, definir escenaris, executar benchmarks i
visualitzar resultats en temps real.

## Què fa

- Navega per le catàleg de components (arquitectures, protocols, plataformes).
- Crea i edita escenaris combinant components.
- Executa benchmarks (crea Jobs a K8s) via el `benchmark-orchestrator`.
- Monitoritza métriques en viu: latència, throughput, error rate, percentils.
- Compara resultats de múltiples runs.
- Tema clar/fosc personalitzat (variables CSS).

## Estructura

```
src/
├── components/
│   ├── Root/              # Layout principal (header, nav, footer)
│   │   ├── Root.tsx       # App wrapper amb context + providers
│   │   ├── TopNavigationShell.tsx  # Navbar amb menús
│   │   ├── LogoIcon.tsx, LogoFull.tsx  # Branding
│   │   └── index.ts
│   ├── catalog/
│   │   └── EntityPage.tsx # Detall d'un component del catàleg
│   └── search/
│       └── SearchPage.tsx # Search global (Backstage)
├── App.tsx                # Routes principals + tema
├── apis.ts                # Configuration d'APIs
├── theme-vars.css         # Variables CSS personalitzades
├── setupTests.ts          # Jest config
└── *.test.ts              # Tests unitaris
```

## Engegada en local

```bash
yarn install         # només el primer cop
yarn workspace app start
```

El frontend arrenca a **http://localhost:3000** i carrega el backend des de
`http://localhost:7007`.

## Variables d'entorn

| Variable | Defecte | Descripció |
|----------|---------|-----------|
| `PORT` | `3000` | Port HTTP |
| `DANGEROUSLY_BYPASS_IDENTITY_CHECK` | (Backstage) | Per env dev |

## Connexions

- **Backend Backstage**: proxy routes a través de `/api/`
- **catalog-service**: `GET /components` (API indirecta via backend)
- **scenario-service**: `GET/POST /scenarios`
- **benchmark-orchestrator**: `POST /executions`
- **metrics-api**: WebSocket + `GET /metrics` (live charts)

## Estil i tema

- **Material-UI** (`@material-ui/core`)
- **Backstage theme provider** amb temes clar i fosc
- **Variables CSS** a `theme-vars.css` per personalitzar colors, espaiat
- **Prettier** per format (`yarn prettier:check`)

## Tests

```bash
yarn workspace app test
```

Cobertura mínima del 80%. Tests a `*.test.ts`.
