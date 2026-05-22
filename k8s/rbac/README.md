# `k8s/rbac/` - Control d'acces

Aquest directori conte el ServiceAccount i els permisos que necessita
`benchmark-orchestrator` per crear execucions al cluster.

## Recursos

| Manifest | Recursos | Servei |
|---|---|---|
| `benchmark-orchestrator-rbac.yaml` | ServiceAccount + ClusterRole + ClusterRoleBinding | `benchmark-orchestrator` |

## Permisos actuals

L'orquestrador necessita:

- `namespaces`: crear i eliminar namespaces efimers `sc-*`.
- `jobs.batch`: crear i consultar Jobs del `load-generator`.
- `pods` i `pods/log`: consultar estat i logs de Jobs.
- `services` i `endpoints`: verificar que el broker triat esta preparat abans de crear el Job.
- `secrets`: copiar `acr-secret` al namespace efimer del run.

## Aplicar i verificar

```bash
kubectl apply -f k8s/rbac/benchmark-orchestrator-rbac.yaml
kubectl describe sa benchmark-orchestrator -n apis-asincrones
kubectl describe clusterrole benchmark-orchestrator-role
kubectl describe clusterrolebinding benchmark-orchestrator-binding
```

## Nota

S'utilitza `ClusterRole` perque l'orquestrador crea namespaces nous i copia
secrets a namespaces efimers. Aixo s'ha de mantenir limitat a les accions
necessaries; no donar permisos generals de `*`.
