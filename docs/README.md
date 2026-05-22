# `docs/` - Documentacio tecnica

Aquesta carpeta recull la documentacio tecnica que acompanya el portal.
El README principal del repositori dona la visio general; aquesta carpeta
serveix per ampliar arquitectura, decisions i operativa.

## Documents disponibles

| Document | Que conte |
|---|---|
| [`architecture.md`](architecture.md) | Diagrama del sistema, serveis, ports i flux d'una execucio. |
| [`migracio-aks-azure-students.md`](migracio-aks-azure-students.md) | Pla de reconstruccio del cluster AKS quan la subscripcio original queda deshabilitada o nomes lectura. |
| [`guia-operativa-aks-students.md`](guia-operativa-aks-students.md) | Comandes pas a pas per arrencar, apagar, validar, executar proves i usar Grafana. |

## Recursos relacionats

| Ruta | Contingut |
|---|---|
| [`../README.md`](../README.md) | Resum actual del projecte i estat del portal. |
| [`../plugins/`](../plugins/) | Plugin Backstage visible per l'usuari. |
| [`../packages/`](../packages/) | App i microserveis. |
| [`../k8s/`](../k8s/) | Manifests Kubernetes. |
