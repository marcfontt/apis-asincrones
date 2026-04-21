# `plugins/async-benchmark/src`

## Jerarquia interna

- `pages/`: una pàgina per fitxer. Cada fitxer exporta la vista principal de la ruta.
- `shared/metrics/`: helpers de mètriques reutilitzables entre resultats en directe i historial.
- `shared/results/`: agregacions i semàntica de dades històriques.
- `plugin.ts`: punt d'entrada del plugin Backstage.
- `theme.ts`: sistema visual del portal.

## Convenció

Quan una funcionalitat és específica d'una ruta, es queda a `pages/`.
Quan una lògica es reutilitza o necessita tests independents, es mou a `shared/`.
