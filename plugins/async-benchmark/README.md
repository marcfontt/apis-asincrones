# `plugins/async-benchmark`

Plugin principal del portal. Conté les pantalles que veu l'usuari per
entendre components, crear escenaris, seguir execucions i comparar
resultats.

## Pàgines

| Fitxer | Què fa |
|--------|--------|
| `src/pages/HomePage.tsx` | Explica el flux general del sistema i dona accessos ràpids. |
| `src/pages/CatalogPage.tsx` | Mostra components, compatibilitat i detalls de reproduïbilitat. |
| `src/pages/ScenariosPage.tsx` | Crea, edita, duplica i executa escenaris. |
| `src/pages/ExecucionsPage.tsx` | Mostra runs actius, aturats i finalitzats. |
| `src/pages/ResultatsPage.tsx` | Mostra historial, comparació i detall de puntuació. |

## Components compartits

| Component | Funció |
|-----------|--------|
| `FilterPanel` | Dona el mateix format als filtres de totes les pàgines. |
| `GuidePanel` | Dona el mateix format a guies, blocs d'ajuda i passos. |
| `TutorialOverlay` | Mostra tutorials per pàgina amb mock visual i cursor animat. |
| `CompatibilityMatrix` | Ensenya si una combinació és executable, requereix configuració o està bloquejada. |
| `MetricsDetailDrawer` | Mostra explicació detallada de mètriques quan cal context. |

Els tutorials no s'obren sols. L'usuari els obre amb el botó de tutorial
de cada pàgina. El botó sempre diu `Tutorial`, també si l'usuari ja l'ha
obert abans.

El mock del tutorial fa servir la mateixa idea visual que el portal:
navegació superior, zones de contingut i cursor animat que apunta a
elements que existeixen a cada pàgina.

## Fonts compartides

| Fitxer | Responsabilitat |
|--------|-----------------|
| `src/shared/catalog/compatibility.ts` | Criteri únic de compatibilitat. |
| `src/shared/catalog/reproducibility.ts` | Dades de reproduïbilitat, versions conegudes i snippets de configuració. |
| `src/shared/results/scenarioDetail.ts` | Preparació del detall d'un escenari. |
| `src/shared/results/historyMetrics.ts` | Helpers per comptar mostres, missatges i historial. |
| `src/shared/metrics/liveMetrics.ts` | Lectura segura de mètriques en directe. |

## Idiomes

Les pàgines fan servir el sistema d'i18n del paquet `packages/app`.
Tot text visible ha d'anar per clau de traducció. Les dades internes,
identificadors d'API i noms de mètriques es mantenen en anglès quan formen
part del contracte tècnic.

## Criteri de codi

- Millor codi llegible que expressions massa compactes.
- Comentaris només on expliquen una decisió o una regla de negoci.
- Booleans amb prefixos clars: `is`, `has`, `can`, `should`.
- Handlers amb prefix `handle`.
- Dades derivades amb noms com `filteredRuns`, `sortedRuns` o `visibleItems`.
- No s'han afegit dependències noves per als tutorials, guies o filtres.
