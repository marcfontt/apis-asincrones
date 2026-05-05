# `k8s/rbac/` — Control d'accés (RBAC)

Aquest directori conté configuracions de control d'accés (ServiceAccounts, Roles, RoleBindings)
perquè els microserveis tinguin els permisos mínims necessaris.

## Namespace
Tots els recursos RBAC es desplegen al namespace `apis-asincronas`.

## Manifests

| Manifest | Recurs | Servei | Permisos |
|----------|--------|--------|----------|
| `benchmark-orchestrator-rbac.yaml` | ServiceAccount + Role + RoleBinding | Benchmark Orchestrator | Crear, llistar, veure Jobs i Pods |

## benchmark-orchestrator-rbac.yaml

### ServiceAccount
```yaml
name: benchmark-orchestrator-sa
namespace: apis-asincronas
```

Identifica l'orquestrador dins el cluster.

### Role
Permisos mínims per crear i gestionar Jobs:
- `jobs.batch` (create, list, get, watch)
- `pods.core` (get, list, watch, logs)

### RoleBinding
Connecta el ServiceAccount amb el Role:
```yaml
roleRef:
  kind: Role
  name: benchmark-orchestrator-role
subjects:
  - kind: ServiceAccount
    name: benchmark-orchestrator-sa
```

El Deployment usa `serviceAccountName: benchmark-orchestrator-sa` per executar-se
amb aquests permisos.

## Per què RBAC?

- **Seguretat**: El contenedor no té accés a la totalitat del cluster.
- **Auditoria**: Kubernetes registra totes les accions sota el ServiceAccount.
- **Aïllament**: Si l'orquestrador es compromet, l'atacant només pot crear Jobs, no veure secrets.

## Aplicar canvis

```bash
# Desplegar RBAC
kubectl apply -f k8s/rbac/benchmark-orchestrator-rbac.yaml

# Verificar
kubectl get sa -n apis-asincronas
kubectl get role -n apis-asincronas
kubectl get rolebinding -n apis-asincronas
```

## Monitorar

```bash
# Veure SA
kubectl describe sa benchmark-orchestrator-sa -n apis-asincronas

# Veure Role
kubectl describe role benchmark-orchestrator-role -n apis-asincronas

# Veure qui està bound
kubectl describe rolebinding benchmark-orchestrator-rolebinding -n apis-asincronas
```

## Afegir nous permisos

Si l'orquestrador necessita més (ex. escalat d'HPA):

```yaml
rules:
  - apiGroups: ["apps"]
    resources: ["deployments/scale"]
    verbs: ["get", "patch"]
```

Actualiza `benchmark-orchestrator-role` i redeplega.

## Notes

- Aquests són permisos **namespace-scoped**. Úsals amb Role + RoleBinding.
- Per permisos globals: ClusterRole + ClusterRoleBinding (NO recomanat per a microserveis).
