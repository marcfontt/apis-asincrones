# `k8s/` - Manifests AKS

Aquest directori conté els manifests per desplegar el portal, els microserveis, els brokers i la persistència necessària per al benchmark.

## Namespaces

| Namespace | Funció |
|---|---|
| `apis-asincrones` | Backstage, microserveis, Elasticsearch i Grafana. |
| `brokers` | Kafka amb Strimzi, RabbitMQ i NATS. |
| `sc-*` | Namespaces efímers creats per l'orquestrador per a cada run. |

Els namespaces `sc-*` no es creen manualment. Els crea i elimina el `benchmark-orchestrator`.

## Estructura

```text
k8s/
|-- deployments/  # Deployments i ConfigMaps principals
|-- services/     # Services interns i LoadBalancer de Backstage
|-- storage/      # StorageClass i PVCs
|-- rbac/         # Permisos de l'orquestrador
|-- kafka/        # Recursos Strimzi
`-- brokers/      # NATS i RabbitMQ
```

## Ordre d'aplicació

```bash
kubectl create namespace apis-asincrones --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace brokers --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f k8s/storage/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/rbac/
kubectl apply -f k8s/brokers/
```

Kafka necessita l'operador Strimzi:

```bash
kubectl apply -f 'https://strimzi.io/install/latest?namespace=brokers' -n brokers
kubectl wait deployment/strimzi-cluster-operator -n brokers --for=condition=Available --timeout=300s
kubectl apply -f k8s/kafka/
```

## Validació mínima

```bash
kubectl get pods -n apis-asincrones
kubectl get pods,endpoints -n brokers
kubectl get kafka,kafkanodepool -n brokers
kubectl logs -n apis-asincrones deployment/benchmark-orchestrator --tail=40
```

## Concurrència i nodes

Per a dades finals, fixa:

```powershell
kubectl set env deployment/benchmark-orchestrator -n apis-asincrones MAX_CONCURRENT_RUNS=1
```

Per a demo ràpida es pot usar `MAX_CONCURRENT_RUNS=3`, però els resultats són menys nets perquè hi ha més càrrega simultània.

Si els Jobs demanen node selector, comprova els labels:

```powershell
kubectl get nodes -L benchmark-role
```

Si falta el label:

```powershell
$LOAD_NODE = (kubectl get nodes --no-headers | Select-Object -First 1).ToString().Trim().Split()[0]
kubectl label node $LOAD_NODE benchmark-role=loadgen --overwrite
```

## Observabilitat

```bash
kubectl port-forward -n apis-asincrones svc/grafana 3000:3000
kubectl port-forward -n apis-asincrones svc/elasticsearch 9200:9200
```

Les credencials de Grafana estan al secret `grafana-admin`.

```bash
kubectl get secret grafana-admin -n apis-asincrones -o jsonpath="{.data.user}" | base64 -d
echo
kubectl get secret grafana-admin -n apis-asincrones -o jsonpath="{.data.password}" | base64 -d
echo
```
