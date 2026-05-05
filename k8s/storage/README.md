# `k8s/storage/` — PersistentVolumeClaims i StorageClass

Aquest directori defineix emmagatzematge persistent per als serveis
que necessiten conservar dades entre redeploys.

## Namespace
Tots els recursos de storage es desplegen al namespace `apis-asincronas`.

## Manifests

| Manifest | Recurs | Servei | Mida | Política de reclamació |
|----------|--------|--------|------|------------------------|
| `storageclass-retain.yaml` | StorageClass | — | — | Retain (no esborrar discs) |
| `elasticsearch-pvc.yaml` | PVC | Elasticsearch | 10Gi | azure-retain |
| `grafana-pvc.yaml` | PVC | Grafana | 1Gi | azure-retain |

## Per què almacenar

### Elasticsearch (10Gi)
- **Dades**: Índexs `async-metrics`, `scenario-data`, etc.
- **Motiu**: Persistència de resultats de benchmarks entre redeploys
- **Reclamació**: `Retain` — Azure NO esborra el disc si es borra la PVC

### Grafana (1Gi)
- **Dades**: Dashboards, datasources provisioning
- **Motiu**: Evitar pèrdua de configuració a cada redeploy
- **Reclamació**: `Retain` — Azure conserva el disc

## StorageClass: azure-retain

```yaml
provisioner: kubernetes.io/azure-disk
reclaimPolicy: Retain  # Els discs NO s'esborren
```

### Per què Retain?

Si un Deployment es borra i la PVC es borra accidentalment, els discs
Azure conserven les dades. Pots reassociar-los manualment.

**Alternativa**: `Delete` (esborrar automàticament). Menys segur per dades sensibles.

## Aplicar canvis

```bash
# Crear storageclass i PVCs
kubectl apply -f k8s/storage/storageclass-retain.yaml
kubectl apply -f k8s/storage/elasticsearch-pvc.yaml
kubectl apply -f k8s/storage/grafana-pvc.yaml

# Verificar
kubectl get pvc -n apis-asincronas
kubectl get storageclass
```

## Monitorar

```bash
# Veure PVCs i estat
kubectl get pvc -n apis-asincronas

# Veure dades ocupades
kubectl describe pvc elasticsearch-pvc -n apis-asincronas

# Veure PersistentVolumes subjacents
kubectl get pv
```

## Recuperar dades si s'esborra la PVC

1. Veure discs orfes a Azure:
   ```bash
   az disk list --resource-group <grup-recursos>
   ```

2. Crear nova PVC i associar disc:
   ```yaml
   kind: PersistentVolume
   spec:
     azureDisk:
       diskName: <nom-disc-azure>
       diskURI: /subscriptions/.../disks/<nom-disc>
   ```

3. Crear Deployment i muntar PVC.

## Notes

- **Mida**: 10Gi per ES pot ser insuficient si els benchmarks generen moltes mètriques.
  Monitorat via `kubectl top pvc` o `az disk show`.
- **Performance**: Azure Disk ofereix P10 (128 IOPS), P20 (500 IOPS), etc.
  Per benchmarking, P20 és recomanat.
