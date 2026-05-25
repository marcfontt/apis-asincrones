# `packages/app`

Frontend Backstage del portal. Defineix la navegació principal, el tema visual, els idiomes i el contenidor on es renderitza el plugin `async-benchmark`.

## Què fa

- Mostra Home, Catàleg, Escenaris, Execucions, Resultats i Settings.
- Permet canviar idioma entre català, castellà i anglès.
- Permet canviar tema clar o fosc.
- Usa el backend de Backstage com a proxy cap als microserveis.
- Manté una navegació comuna perquè totes les pàgines tinguin el mateix marc visual.

## Estructura important

```text
src/
|-- components/
|   |-- Root/              # layout general i navegació superior
|   |-- catalog/           # integració mínima amb catàleg Backstage
|   `-- search/            # pantalla de cerca Backstage
|-- App.tsx                # rutes de l'aplicació
|-- apis.ts                # APIs registrades a Backstage
|-- theme-vars.css         # variables visuals
`-- setupTests.ts
```

Els README interns de `components/` s'han eliminat perquè la informació útil queda centralitzada aquí i al README del plugin.

## Idioma i tema

L'idioma es desa a `localStorage` amb la clau `apis-asincrones.language`. Els textos visibles del plugin han de venir de claus de traducció, no de literals dispersos.

El tema clar i fosc comparteix variables CSS. Si s'afegeix un color nou, s'ha de revisar en els dos temes.

## Connexions

El frontend parla amb els microserveis a través de `/api/proxy/...`:

| Servei | Ruta principal |
|---|---|
| `catalog-service` | `/api/proxy/catalog-service/components` |
| `scenario-service` | `/api/proxy/scenario-service/scenarios` |
| `benchmark-orchestrator` | `/api/proxy/benchmark-orchestrator/runs` |
| `metrics-api` | `/api/proxy/metrics-api/metrics` |

## Engegada local

```bash
corepack yarn install --immutable
corepack yarn start
```

El frontend arrenca a `http://localhost:3000` i el backend de Backstage a `http://localhost:7007`.

## Proves

```bash
corepack yarn workspace app test
npx tsc --noEmit
```

Els tests importants comproven que el seed del catàleg inclou SEA, que les mètriques en directe no barregen `runId`, que l'historial calcula correctament mostres i missatges, i que la pantalla principal carrega sense trencar la navegació.
