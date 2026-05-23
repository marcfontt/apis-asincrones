# `docs/` - Documentació tècnica

Aquesta carpeta recull la documentació tècnica que acompanya el portal.
El README principal del repositori dona la visió general; aquesta carpeta
serveix per ampliar arquitectura, decisions i operativa.

## Documents disponibles

| Document | Que conte |
|---|---|
| [`architecture.md`](architecture.md) | Diagrama del sistema, serveis, ports i flux d'una execució. |
| [`aplicar-canvis-finals.md`](aplicar-canvis-finals.md) | Comandes curtes per construir imatges, aplicar manifests i validar el cluster final. |
| [`migracio-aks-azure-students.md`](migracio-aks-azure-students.md) | Pla de reconstrucció del cluster AKS quan la subscripció original queda deshabilitada o només lectura. |
| [`guia-operativa-aks-students.md`](guia-operativa-aks-students.md) | Comandes pas a pas per arrencar, apagar, validar, executar proves i usar Grafana. |
| [`memoria-actualitzacio-aks.tex`](memoria-actualitzacio-aks.tex) | Fragment LaTeX per explicar la migració final, costos, nodes i estat de l'aplicació a la memòria. |
| [`registre-canvis-dia-i-mig.md`](registre-canvis-dia-i-mig.md) | Llista de canvis recents per mantenir el prompt i la documentació alineats. |

## Recursos relacionats

| Ruta | Contingut |
|---|---|
| [`../README.md`](../README.md) | Resum actual del projecte i estat del portal. |
| [`../plugins/`](../plugins/) | Plugin Backstage visible per l'usuari. |
| [`../packages/`](../packages/) | App i microserveis. |
| [`../k8s/`](../k8s/) | Manifests Kubernetes. |
