# `k8s/deployments/` — Deployments dels serveis principals

Aquest directori conté totes les definicions de Deployment que executen els serveis
del benchmark al cluster AKS.

## Namespace
Tots els Deployments es desplegan al namespace `apis-asincronas`.

## Manifests

### Serveis de negoci

| Manifest | Servei | Dependències | Notes |
|----------|--------|--------------|-------|
| `backstage.yaml` | Backstage UI | Catalog Service | Portal principal; LoadBalancer |
| `catalog-service.yaml` | Catalog Service | NATS | CRUD de components; auto-seed |
| `scenario-service.yaml` | Scenario Service | Elasticsearch | CRUD d'escenaris; persisteix a ES |
| `metrics-api.yaml` | Metrics API | Elasticsearch | WebSocket + REST API; índex async-metrics |

### Sistema de benchmarking

| Manifest | Servei | Dependències | Notes |
|----------|--------|--------------|-------|
| `benchmark-orchestrator.yaml` | Benchmark Orchestrator | K8s API, NATS | Crea Jobs dinàmics; necessita RBAC |

### Observabilitat

| Manifest | Servei | Dependències | Notes |
|----------|--------|--------------|-------|
| `elasticsearch.yaml` | Elasticsearch | PVC | Single-node; heap 1Gi; health probes |
| `grafana.yaml` | Grafana | Elasticsearch | Visualització de mètriques; PVC per dashboards |
| `grafana-provisioning.yaml` | Grafana (ConfigMap) | — | Configmap amb datasource d'ES automàtic |
| `grafana-secret.yaml` | Grafana (Secret) | — | Password d'admin; actualizat a mà |

## Aplicar canvis

```bash
# Desplegar tots els Deployments
kubectl apply -f k8s/deployments/

# Desplegar només un servei
kubectl apply -f k8s/deployments/backstage.yaml

# Reiniciar un servei (força nova imatge)
kubectl rollout restart deployment/backstage -n apis-asincronas
```

## Monitorar

```bash
# Veure estat de tots els Deployments
kubectl get deployments -n apis-asincronas

# Veure logs d'un servei
kubectl logs -n apis-asincronas -l app=backstage --tail=50 -f

# Describir un Deployment (veure events, pullPolicy, etc.)
kubectl describe deployment backstage -n apis-asincronas
```

## Configuració de recursos

Tots els Deployments especifiquen:
- **Requests**: CPU i memòria garantida
- **Limits**: Límit màxim de recursos

Revisa cada manifest per ajustar segons necessitat del cluster.

## Nota sobre imatges Docker

Les imatges es pulen de repositoris:
- `acr-asincrones.azurecr.io` — Azure Container Registry (privat)
- `quay.io` — Per a Strimzi, Elasticsearch, etc.

Assegura't que el cluster AKS té accés als secrets d'imagePullSecrets si usa registres privats.
