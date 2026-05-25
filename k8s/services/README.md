# `k8s/services/` - Services de Kubernetes

Aquest directori exposa els Deployments del namespace `apis-asincrones`.

## Manifests

| Manifest | Service | Type | Port |
|---|---|---|---:|
| `backstage-service.yaml` | `backstage-service` | LoadBalancer | 80 |
| `catalog-service.yaml` | `catalog-service` | ClusterIP | 3001 |
| `scenario-service.yaml` | `scenario-service` | ClusterIP | 3002 |
| `benchmark-orchestrator.yaml` | `benchmark-orchestrator` | ClusterIP | 3003 |
| `metrics-api.yaml` | `metrics-api` | ClusterIP | 3004 |
| `elasticsearch.yaml` | `elasticsearch` | ClusterIP | 9200, 9300 |
| `grafana.yaml` | `grafana` | ClusterIP | 3000 |

## Accés extern

Només Backstage s'exposa amb LoadBalancer:

```bash
kubectl get svc backstage-service -n apis-asincrones
```

La resta de serveis són interns i s'accedeixen a través del proxy de Backstage o amb `port-forward`.

## Port-forward útil

```bash
kubectl port-forward -n apis-asincrones svc/grafana 3000:3000
kubectl port-forward -n apis-asincrones svc/elasticsearch 9200:9200
kubectl port-forward -n apis-asincrones svc/metrics-api 3004:3004
```

## Aplicar i validar

```bash
kubectl apply -f k8s/services/
kubectl get svc -n apis-asincrones
kubectl get endpoints -n apis-asincrones
```

## Nota de cost

El Service `LoadBalancer` crea una IP pública a Azure. Els `ClusterIP` no exposen serveis fora del clúster i són suficients per al funcionament intern del benchmark.
