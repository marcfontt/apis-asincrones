# `docs/` — Documentació tècnica

Aquesta carpeta conté la documentació tècnica del projecte.

---

## Documents disponibles

### 🏛️ Arquitectura del sistema
**[architecture.md](architecture.md)**

Diagrama Mermaid de l'arquitectura completa i descripció de cada component:

- Topologia de namespaces al cluster AKS
- Taules de serveis, ports i adreces IP externes
- Flux detallat d'una execució de benchmark

---

## Altres recursos

| Carpeta | Contingut |
|---------|-----------|
| [`../k8s/`](../k8s/) | Manifests Kubernetes (deployments, services, storage, rbac) |
| [`../packages/`](../packages/) | Codi font dels microserveis (Node.js/TypeScript) |
| [`../plugins/`](../plugins/) | Plugin custom de Backstage (`async-benchmark`) |
| [`../README.md`](../README.md) | Visió general del projecte |
