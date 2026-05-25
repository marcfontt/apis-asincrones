# `k8s/deployments/` - Deployments principals

Aquest directori conté els Deployments, ConfigMaps i Secrets dels serveis principals del portal.

## Namespace

Tots aquests recursos es despleguen al namespace `apis-asincrones`.

## Serveis

| Manifest | Servei | Notes |
|---|---|---|
| `backstage.yaml` | Backstage UI | Portal principal. |
| `catalog-service.yaml` | Catalog Service | Catàleg de components. |
| `scenario-service.yaml` | Scenario Service | CRUD d'escenaris. |
| `benchmark-orchestrator.yaml` | Benchmark Orchestrator | Cua i Jobs de Kubernetes. |
| `metrics-api.yaml` | Metrics API | REST i WebSocket de mètriques. |
| `elasticsearch.yaml` | Elasticsearch | Persistència de catàleg, escenaris i mètriques. |
| `grafana.yaml` | Grafana | Visualització de mètriques. |
| `grafana-provisioning.yaml` | Grafana ConfigMap | Datasource d'Elasticsearch. |
| `grafana-secret.yaml` | Grafana Secret | Usuari i contrasenya d'administració. |

## Aplicar i reiniciar

```bash
kubectl apply -f k8s/deployments/
kubectl rollout restart deployment/backstage -n apis-asincrones
kubectl rollout status deployment/backstage -n apis-asincrones --timeout=240s
```

Per reiniciar tots els serveis del portal:

```bash
kubectl rollout restart deployment/backstage deployment/catalog-service deployment/scenario-service deployment/metrics-api deployment/benchmark-orchestrator -n apis-asincrones
```

## Monitoratge

```bash
kubectl get deployments -n apis-asincrones
kubectl get pods -n apis-asincrones
kubectl logs -n apis-asincrones deployment/benchmark-orchestrator --tail=40
```

## Notes de recursos

Els microserveis tenen requests baixos perquè el pressupost d'Azure for Students és limitat. Els brokers són els que s'han d'alinear per a la comparació de rendiment; els manifests d'aquesta carpeta sostenen el portal i la persistència.

Grafana es pot escalar a zero si cal alliberar memòria durant una tanda de proves:

```bash
kubectl scale deployment/grafana -n apis-asincrones --replicas=0
```

Les mètriques no es perden per apagar Grafana, perquè es desen a Elasticsearch.
