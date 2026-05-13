# `packages/app`

Frontend Backstage del portal. Dona la navegació principal, el tema visual,
els idiomes i el contenidor on es renderitza el plugin `async-benchmark`.

## Què fa

- Mostra Home, Catàleg, Escenaris, Execucions, Resultats i Settings.
- Permet canviar idioma entre català, castellà i anglès.
- Permet canviar tema clar o fosc.
- Manté una navegació comuna amb accessos ràpids.
- Usa el backend de Backstage com a proxy cap als microserveis.

## Estructura

```text
src/
├── components/
│   ├── Root/
│   │   ├── Root.tsx
│   │   ├── TopNavigationShell.tsx
│   │   ├── LogoIcon.tsx
│   │   └── LogoFull.tsx
│   ├── catalog/
│   └── search/
├── App.tsx
├── apis.ts
├── theme-vars.css
└── setupTests.ts
```

## Idioma i tema

L'idioma es desa a `localStorage` amb la clau
`apis-asincrones.language`. Els textos del portal han de venir de claus de
traducció, no de literals solts dins les pàgines.

El tema clar i fosc comparteix variables CSS. Si s'afegeix un color nou,
cal definir-lo per als dos temes.

## Engegada local

```bash
corepack yarn install --immutable
corepack yarn start
```

El frontend arrenca a `http://localhost:3000` i el backend de Backstage a
`http://localhost:7007`.

## Connexions

El frontend parla amb els microserveis a través de `/api/proxy/...`:

| Servei | Ruta principal |
|--------|----------------|
| `catalog-service` | `/api/proxy/catalog-service/components` |
| `scenario-service` | `/api/proxy/scenario-service/scenarios` |
| `benchmark-orchestrator` | `/api/proxy/benchmark-orchestrator/runs` |
| `metrics-api` | `/api/proxy/metrics-api/metrics` |

## Criteri visual

- Botons coherents entre pàgines.
- Focus visible per teclat.
- Filtres amb el mateix patró que la resta del plugin.
- Text curt i directe.
- Cap dependència nova per a components visuals del portal.

## Proves

```bash
corepack yarn workspace app test
npx tsc --noEmit
```

| Fitxer | Què comprova |
|--------|--------------|
| `src/App.test.tsx` | Que l'app Backstage arrenca i renderitza la pantalla base sense trencar la navegació. |
| `src/catalogSeed.test.ts` | Que el seed del catàleg inclou SEA i que la sincronització afegeix components que falten sense reemplaçar files existents. |
| `src/historyMetrics.test.ts` | Que el resum històric calcula missatges i mostres a partir de les dades persistides. |
| `src/liveMetrics.test.ts` | Que les mètriques en directe mantenen el `runId` correcte i no barregen execucions. |
| `src/metricsQuery.test.ts` | Que les consultes a Elasticsearch filtren per camps exactes (`keyword`) i no barregen execucions. |
| `src/historySummary.test.ts` | Que l'historial només inclou estats terminals o execucions antigues sense estat. |
| `e2e-tests/app.test.ts` | Smoke test de navegador per comprovar que la pantalla principal carrega. |
