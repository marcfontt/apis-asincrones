# `k8s/services/` — Serveis (ClusterIP i LoadBalancer)

Aquest directori exposa els Deployments coma Serveis de Kubernetes,
permetent que altres pods hi accedisquen dins el cluster o des de fora.

## Namespace
Tots els Serveis es desplegen al namespace `apis-asincrones`.

## Manifests

| Manifest | Servei | Type | Port | Notas |
|----------|--------|------|------|-------|
| `backstage-service.yaml` | Backstage | LoadBalancer | 80/443 | Accés extern; IP pública AKS |
| `catalog-service.yaml` | Catalog Service | ClusterIP | 3001 | Accés intern |
| `scenario-service.yaml` | Scenario Service | ClusterIP | 3002 | Accés intern |
| `metrics-api.yaml` | Metrics API | ClusterIP | 3003 | Accés intern (WebSocket + REST) |
| `benchmark-orchestrator.yaml` | Orchestrator | ClusterIP | 8080 | Accés intern |
| `elasticsearch.yaml` | Elasticsearch | ClusterIP | 9200/9300 | REST (9200) + node-to-node (9300) |
| `grafana.yaml` | Grafana | ClusterIP | 3000 | Port accés intern |

## Accedir als serveis

### Des d'altre pod (intern)
```
http://catalog-service.apis-asincrones.svc.cluster.local:3001
http://elasticsearch.apis-asincrones.svc.cluster.local:9200
```

### Des de fora del cluster

#### Backstage (LoadBalancer)
```
http://<IP-PUBLICA-AKS>:80
```
Obté la IP pública:
```bash
kubectl get svc backstage-service -n apis-asincrones
# Output: EXTERNAL-IP = 20.23.94.191
```

#### Port-forward (temporalment)
```bash
# Accés a Elasticsearch
kubectl port-forward -n apis-asincrones svc/elasticsearch 9200:9200

# Accés a Grafana
kubectl port-forward -n apis-asincrones svc/grafana 3000:3000
# Obre http://localhost:3000
```

## Aplicar canvis

```bash
# Desplegar/actualizar tots els Serveis
kubectl apply -f k8s/services/

# Desplegar només un
kubectl apply -f k8s/services/elasticsearch.yaml

# Eliminar un servei (però NO els Pods)
kubectl delete svc elasticsearch -n apis-asincrones
```

## Monitorar

```bash
# Veure tots els serveis
kubectl get svc -n apis-asincrones

# Veure detalls (endpoints, ClusterIP, etc.)
kubectl describe svc elasticsearch -n apis-asincrones

# Verificar endpoints actius
kubectl get endpoints elasticsearch -n apis-asincrones
```

## Notes

- **LoadBalancer**: Crea IP pública a Azure. Comporta cost.
- **ClusterIP**: Accés intern únic; suficcient per al benchmark.
- **Ports**: Els Serveis MapGen ports del Pod al Service. Revisa cadascun.
