# `plugins/async-benchmark`

Plugin principal del portal. Conté les pantalles que l'usuari fa servir per entendre components, preparar escenaris, seguir execucions i comparar resultats.

## Pàgines

| Fitxer | Funció |
|---|---|
| `src/pages/HomePage.tsx` | Context inicial: brokers, flux de prova, modes del portal i accés a tutorials. |
| `src/pages/CatalogPage.tsx` | Components, compatibilitat, configuració i reproduïbilitat. |
| `src/pages/ScenariosPage.tsx` | Creació, edició, duplicació, execució i aturada d'escenaris. |
| `src/pages/ExecucionsPage.tsx` | Seguiment de runs pendents, actius i finalitzats. |
| `src/pages/ResultatsPage.tsx` | Historial, comparació per format, mètriques i puntuació. |

## Components compartits

| Component | Responsabilitat |
|---|---|
| `FilterPanel` | Manté el mateix patró visual als filtres. |
| `GuidePanel` | Mostra guies i passos de cada pàgina. |
| `TutorialOverlay` | Explica on clicar i què esperar a cada pantalla. |
| `CompatibilityMatrix` | Mostra si una combinació és executable, requereix configuració o no està disponible. |
| `MetricsDetailDrawer` | Dona context de mètriques i puntuació quan l'usuari obre un detall. |

## Fonts compartides

| Fitxer | Responsabilitat |
|---|---|
| `src/shared/catalog/compatibility.ts` | Regles de compatibilitat entre arquitectura, protocol i plataforma. |
| `src/shared/catalog/defaultComponents.ts` | Seed visible del catàleg quan encara no hi ha dades carregades. |
| `src/shared/catalog/reproducibility.ts` | Versions, notes i passos per replicar components. |
| `src/shared/metrics/liveMetrics.ts` | Lectura segura de mètriques en directe. |
| `src/shared/results/historyMetrics.ts` | Resum històric i recompte de mostres. |
| `src/shared/results/scenarioDetail.ts` | Preparació del detall d'un escenari o run. |

## Regles de UI

- La llista principal de resultats en directe només mostra execucions en curs.
- Les execucions pendents es mostren com a cua, sense ocupar el mateix espai que els runs actius.
- A Execucions, l'estat ha de diferenciar pendent, en execució, completat, fallit i cancel·lat.
- A Resultats, les comparacions s'han de llegir primer per format de dades.
- La puntuació ordena visualment, però la justificació final sempre ha de mirar latència, P99, throughput i errors.

## Criteri de codi

- Noms de booleans amb `is`, `has`, `can` o `should`.
- Handlers amb prefix `handle`.
- Dades derivades amb noms com `filteredRuns`, `sortedRuns` o `visibleItems`.
- Comentaris curts només quan expliquen una regla de negoci.
- Sense dependències noves per a tutorials, guies o filtres.
