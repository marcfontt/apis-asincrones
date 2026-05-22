# `k8s/` - Manifests d'infraestructura

Aquest directori conté els YAMLs per desplegar el portal i els serveis de
benchmark a AKS.

## Namespace

Els manifests actuals fan servir principalment:

| Namespace | Funció |
|-----------|--------|
| `apis-asincrones` | Backstage, microserveis, Elasticsearch i Grafana. |
| `brokers` | Kafka gestionat per Strimzi, RabbitMQ, NATS i altres brokers de prova. |
| `sc-*` | Namespaces efímers creats per l'orquestrador per a cada run. |

Kafka comparteix namespace amb la resta de brokers perquè és una frontera
operativa, no una frontera de mesura. La comparació es defensa amb recursos
fixats, execució serial i perfils de càrrega iguals.

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
| Kafka | OK condicionat a recursos | Strimzi al namespace `brokers`. |
| RabbitMQ | OK | Manifest minim `k8s/brokers/rabbitmq.yaml`. |
| NATS | OK | Manifest minim `k8s/brokers/nats.yaml` amb `max_payload=4MB`. |

## Aplicar canvis

```bash
kubectl apply -f k8s/storage/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/rbac/
kubectl apply -f k8s/brokers/
```

Kafka necessita l'operador Strimzi abans d'aplicar `k8s/kafka/`:

```bash
kubectl create namespace brokers --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f 'https://strimzi.io/install/latest?namespace=brokers' -n brokers
kubectl wait deployment/strimzi-cluster-operator -n brokers --for=condition=Available --timeout=120s
kubectl apply -f k8s/kafka/
```

Validacio minima dels brokers:

```bash
kubectl get pods,svc,endpoints -n brokers
kubectl rollout status deployment/rabbitmq -n brokers --timeout=180s
kubectl rollout status deployment/nats -n brokers --timeout=120s
kubectl get kafka,kafkanodepool -n brokers
```

Si només canvies Grafana:

```bash
kubectl apply -f k8s/deployments/grafana-provisioning.yaml
kubectl apply -f k8s/deployments/grafana-secret.yaml
kubectl apply -f k8s/deployments/grafana.yaml
kubectl rollout restart deployment/grafana -n apis-asincrones
```

Si només canvies Elasticsearch:

```bash
kubectl apply -f k8s/storage/elasticsearch-pvc.yaml
kubectl apply -f k8s/deployments/elasticsearch.yaml
kubectl rollout restart deployment/elasticsearch -n apis-asincrones
```

## Observabilitat

```bash
kubectl logs -n apis-asincrones <pod>
kubectl port-forward -n apis-asincrones svc/grafana 3000:3000
```

Grafana queda disponible a `http://localhost:3000` durant el
port-forward. La contrasenya d'admin viu al Secret de Grafana:

```bash
kubectl get secret grafana-admin -n apis-asincrones -o jsonpath="{.data.user}" | base64 -d
echo
kubectl get secret grafana-admin -n apis-asincrones -o jsonpath="{.data.password}" | base64 -d
echo
```
