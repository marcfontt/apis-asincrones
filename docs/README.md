# `docs/` — Índex de documentació operativa

Aquesta carpeta recopila tota la documentació per instal·lar, configurar i mantenir
l'infraestructura del benchmark d'APIs asíncrones a AKS.

## Documents per temes

### Instal·lació inicial
- [**INSTAL-CLUSTER.md**](INSTAL-CLUSTER.md) — Guia pas a pas per desplegar el cluster sencer
  - Creació de namespace
  - Desplegament de Kafka (Strimzi)
  - Desplegament de serveis (Elasticsearch, Grafana, microserveis)
  - Verificació final

### Troubleshooting i debugging
- [**TROUBLESHOOTING.md**](TROUBLESHOOTING.md) — Catàleg d'errors i solucions
  - Problemes de imatge Docker
  - Falles de connectivitat entre serveis
  - Issues de Kafka i persistència
  - Problemes de salut dels pods

### Arquitectura
- [**architecture.mmd**](architecture.mmd) — Diagrama Mermaid de l'arquitectura
  - Topologia de serveis
  - Flujos de dades
  - Dependències entre components

## Altres recursos

| Lloc | Contingut |
|------|-----------|
| [`../memoria/`](../memoria/) | Memòria del TFG en LaTeX |
| [`../k8s/`](../k8s/) | Manifests Kubernetes (deployments, services, storage) |
| [`../packages/`](../packages/) | Codi dels microserveis |
| [`../plugins/`](../plugins/) | Plugin custom de Backstage |

## Flujo de lectura recomanat

1. **Primer cop**: INSTAL-CLUSTER.md (instal·lació sencer)
2. **Debugging**: TROUBLESHOOTING.md (si hi ha problemes)
3. **Arquitectura**: architecture.mmd (per entendre la topologia)
4. **Detalls Kubernetes**: [`../k8s/README.md`](../k8s/README.md) (si modifiques manifests)

## Actualitzacions recents

- Elasticsearch: PVC amb `Retain`, health probes, heap 1Gi
- Grafana: Provisioning automàtic i password secret
- Kafka (Strimzi): KRaft mode, sense Zookeeper
- NATS: Config amb `max_payload: 4M` per vídeos 8K

## Contacte

Consulta la memòria TFG per a metodologia, resultats i conclusions completes.
