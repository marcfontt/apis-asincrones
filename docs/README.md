# `docs/` — Índex de documentació operativa

Aquesta carpeta conté tota la documentació tècnica per instal·lar,
configurar i mantenir la infraestructura del benchmark d'APIs asíncrones
sobre Azure Kubernetes Service (AKS).

---

## Documents disponibles

### 🚀 Instal·lació del cluster
**[INSTAL-CLUSTER.md](INSTAL-CLUSTER.md)**

Guia pas a pas per desplegar tot el sistema sobre AKS des de zero:

- Prerequisits i variables d'entorn
- Creació del cluster AKS i Azure Container Registry
- Aplicació de namespace, storage class i secrets
- Instal·lació dels brokers (Kafka/Strimzi, NATS, RabbitMQ, Redpanda)
- Build i push de les imatges dels microserveis
- Verificació final que tot funciona

### 🔧 Resolució de problemes
**[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**

Catàleg d'errors coneguts del projecte i les seves solucions:

- Errors de build i compilació TypeScript
- Problemes de runtime al portal i microserveis
- Errors específics de brokers (NATS payload, RabbitMQ, Kafka)
- Problemes d'observabilitat (Grafana, Elasticsearch)
- Errors del catàleg de components
- Checklist ràpid quan res no funciona

### 🏛️ Arquitectura del sistema
**[architecture.mmd](architecture.mmd)**

Diagrama Mermaid de l'arquitectura completa del sistema:

- Topologia de namespaces al cluster AKS
- Serveis, ports i adreces IP externes
- Flux de dades entre components
- Dependències entre microserveis i brokers

---

## Altres recursos del repositori

| Carpeta | Contingut |
|---------|-----------|
| [`../k8s/`](../k8s/) | Manifests Kubernetes (deployments, services, storage, rbac) |
| [`../packages/`](../packages/) | Codi font dels microserveis (Node.js/TypeScript) |
| [`../plugins/`](../plugins/) | Plugin custom de Backstage (`async-benchmark`) |
| [`../scripts/`](../scripts/) | Scripts auxiliars del projecte |

---

## Ordre de lectura recomanat

```
1. README.md (arrel del repo) ─── Visió general del projecte
         │
         ├── docs/INSTAL-CLUSTER.md ─── Per desplegar per primera vegada
         │
         ├── docs/TROUBLESHOOTING.md ── Per resoldre errors
         │
         ├── docs/architecture.mmd ─── Per entendre la topologia
         │
         └── k8s/README.md ──────────── Per modificar manifests K8s
```

---

## Actualitzacions recents destacades

| Canvi | Descripció |
|-------|------------|
| NATS `max_payload=4MB` | Necessari per al format `video-8k` (~2MB de payload) |
| Elasticsearch scroll | Query amb scroll 5k en 5k; `max_result_window=1.000.000` |
| Grafana provisioning | Dashboards i datasource aprovisionats automàticament |
| Kafka/Strimzi KRaft | Mode sense Zookeeper (Strimzi ≥ 0.40) |
| Storage class `Retain` | PVCs d'ES i Grafana no s'esborren en reiniciar |

---

> Per a la metodologia, resultats i conclusions del projecte,
> consulteu la memòria del PFG (document LaTeX separat del repositori).
