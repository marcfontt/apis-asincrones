# `k8s/rbac/` - Permisos de l'orquestrador

Aquest directori conté el ServiceAccount i els permisos que necessita `benchmark-orchestrator` per crear i controlar execucions.

## Recursos

| Manifest | Recursos |
|---|---|
| `benchmark-orchestrator-rbac.yaml` | ServiceAccount, ClusterRole i ClusterRoleBinding. |

## Permisos necessaris

L'orquestrador necessita:

- crear i eliminar namespaces efímers `sc-*`;
- crear i consultar Jobs;
- consultar Pods i logs;
- llegir Services i Endpoints dels brokers;
- copiar Secrets d'ACR al namespace efímer;
- consultar events bàsics per diagnosticar pendents.

## Aplicar i verificar

```bash
kubectl apply -f k8s/rbac/benchmark-orchestrator-rbac.yaml
kubectl describe serviceaccount benchmark-orchestrator -n apis-asincrones
kubectl describe clusterrole benchmark-orchestrator-role
kubectl describe clusterrolebinding benchmark-orchestrator-binding
```

## Criteri

S'utilitza `ClusterRole` perquè els runs creen namespaces nous. Tot i això, els permisos s'han de mantenir limitats a les accions que l'orquestrador necessita. No donar permisos generals de `*`.
