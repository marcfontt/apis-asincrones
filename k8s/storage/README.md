# `k8s/storage/` - Persistència

Aquest directori defineix l'emmagatzematge persistent dels serveis que han de conservar dades entre redeploys.

## Recursos

| Manifest | Recurs | Servei | Mida |
|---|---|---|---:|
| `storageclass-retain.yaml` | StorageClass | Azure Disk | - |
| `elasticsearch-pvc.yaml` | PVC | Elasticsearch | 10Gi |
| `grafana-pvc.yaml` | PVC | Grafana | 1Gi |

## Per què és necessari

Elasticsearch desa catàleg, escenaris i mètriques. Si es perd aquesta PVC, es perden resultats i configuracions.

Grafana desa dashboards i configuració pròpia. Si s'apaga Grafana amb `replicas=0`, les dades del dashboard continuen al PVC.

## Reclaim policy

La StorageClass usa `Retain` perquè Azure no esborri el disc automàticament si s'elimina una PVC. És més segur per a un projecte on els resultats de les proves són part de l'entrega.

## Aplicació

```bash
kubectl apply -f k8s/storage/storageclass-retain.yaml
kubectl apply -f k8s/storage/elasticsearch-pvc.yaml
kubectl apply -f k8s/storage/grafana-pvc.yaml
kubectl get pvc -n apis-asincrones
kubectl get storageclass
```

## Validació

```bash
kubectl describe pvc elasticsearch-pvc -n apis-asincrones
kubectl describe pvc grafana-pvc -n apis-asincrones
kubectl get pv
```

## Nota

Els 10Gi d'Elasticsearch són suficients per a tandes controlades, però s'ha de vigilar si es repeteixen moltes proves sense netejar dades antigues.
