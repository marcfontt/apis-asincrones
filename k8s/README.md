# `k8s/` - Manifests d'infraestructura

Aquest directori conté els YAMLs per desplegar el portal i els serveis de
benchmark a AKS.

## Namespace

Els manifests actuals fan servir principalment:

| Namespace | Funció |
|-----------|--------|
| `apis-asincronas` | Backstage, microserveis, Elasticsearch i Grafana. |
| `kafka-strimzi` | Cluster Kafka gestionat per Strimzi. |
| `brokers` | RabbitMQ, NATS i altres brokers de prova. |

Si el clúster real usa `apis-asincrones`, cal canviar-ho de manera
coherent a tots els manifests i variables abans de desplegar. No s'ha de
barrejar una grafia al codi i una altra al clúster.

## Estructura

```text
k8s/
├── deployments/
├── services/
├── storage/
├── rbac/
├── kafka/
├── brokers/
└── README.md
```

## Estat de cada peça

| Peça | Estat | Notes |
|------|-------|-------|
| Backstage portal | OK | UI principal. |
| `catalog-service` | OK | Catàleg de components i seed inicial. |
| `scenario-service` | OK | Escenaris persistits a Elasticsearch. |
| `benchmark-orchestrator` | OK | Crea Jobs del `load-generator`. |
| `metrics-api` | OK | REST i WebSocket sobre Elasticsearch. |
| Elasticsearch | OK | Single-node amb PVC. |
| Grafana | OK | Datasource d'Elasticsearch. |
| NATS | Revisar per payload gran | Cal `max_payload` més alt per vídeo 8K. |

## Aplicar canvis

```bash
kubectl apply -f k8s/storage/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/rbac/
kubectl apply -f k8s/brokers/
```

Si només canvies Grafana:

```bash
kubectl apply -f k8s/deployments/grafana-provisioning.yaml
kubectl apply -f k8s/deployments/grafana-secret.yaml
kubectl apply -f k8s/deployments/grafana.yaml
kubectl rollout restart deployment/grafana -n apis-asincronas
```

Si només canvies Elasticsearch:

```bash
kubectl apply -f k8s/storage/elasticsearch-pvc.yaml
kubectl apply -f k8s/deployments/elasticsearch.yaml
kubectl rollout restart deployment/elasticsearch -n apis-asincronas
```

## Observabilitat

```bash
kubectl logs -n apis-asincronas <pod>
kubectl port-forward -n apis-asincronas svc/grafana 3000:3000
```

Grafana queda disponible a `http://localhost:3000` durant el
port-forward. La contrasenya d'admin viu al Secret de Grafana.
