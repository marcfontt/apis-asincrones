# Kubernetes — manifests d'infraestructura

Aquest directori conté tots els YAMLs que defineixen el desplegament del
benchmark al cluster AKS. Aquí trobaràs:

```
k8s/
├── deployments/        # Deployments dels serveis principals
├── services/           # Serveis (ClusterIP/LoadBalancer) que els exposen
├── storage/            # PersistentVolumeClaims (Elasticsearch, Grafana)
├── rbac/               # ServiceAccounts i Roles per a l'orquestrador
├── kafka/              # Strimzi cluster per a Apache Kafka
├── brokers/            # ConfigMaps de NATS, RabbitMQ, etc.
└── README.md           # Aquest fitxer
```

## Estat de cada peça

| Peça                 | Estat | Notes |
|----------------------|-------|-------|
| Backstage portal     | OK    | UI principal — `deployments/backstage.yaml` |
| catalog-service      | OK    | CRUD de components; auto-seed |
| scenario-service     | OK    | CRUD d'escenaris; persisteix a ES |
| benchmark-orchestrator | OK  | Crea Jobs de load-generator a K8s |
| metrics-api          | OK    | WebSocket + REST; índex `async-metrics` |
| Elasticsearch        | OK    | Single-node 8.12; PVC retain |
| Grafana              | OK    | Vistes ad-hoc sobre ES; provisioning automàtic |

## Aplicar canvis (un cop el cluster ja està a punt)

```bash
# Tota la infra d'un cop
kubectl apply -f k8s/storage/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/rbac/
kubectl apply -f k8s/brokers/

# Si toques NOMÉS Grafana:
kubectl apply -f k8s/deployments/grafana-provisioning.yaml
kubectl apply -f k8s/deployments/grafana-secret.yaml
kubectl apply -f k8s/deployments/grafana.yaml
kubectl rollout restart deployment/grafana -n apis-asincronas

# Si toques només Elasticsearch:
kubectl apply -f k8s/storage/elasticsearch-pvc.yaml
kubectl apply -f k8s/deployments/elasticsearch.yaml
kubectl rollout restart deployment/elasticsearch -n apis-asincronas
```

## Canvis recents

- **Elasticsearch**: afegits health probes i increment de heap a 1Gi.
  Nova PVC amb `storageClassName: azure-retain` per evitar pèrdua de dades.
- **Grafana**: la PVC NO estava muntada (perdia dashboards a cada restart).
  Ara està connectada. També s'ha afegit provisioning automàtic del
  datasource d'Elasticsearch i el password d'admin viu en un Secret.
- **NATS**: hi ha `brokers/nats-config.yaml` que puja `max_payload` a 4 MB.
  És imprescindible per executar escenaris de vídeo 8K (~2 MB per missatge).

## Observabilitat

- **Logs**: `kubectl logs -n apis-asincronas <pod>`
- **Mètriques al portal**: <http://20.23.94.191/resultats>
- **Grafana**: `kubectl port-forward -n apis-asincronas svc/grafana 3000:3000`
  i obre <http://localhost:3000>. Usuari: `admin` / contrasenya: vegeu el Secret.
