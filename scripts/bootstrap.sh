#!/bin/bash
set -e

NAMESPACE="apis-asincronas"
ACR="asyncbenchmarkregistry.azurecr.io"
RG="aks-tests"
AKS="apis-asincronas"

echo "=== Bootstrap APIs Asincrones ==="

# 1. Credencials AKS
az aks get-credentials --resource-group $RG --name $AKS --overwrite-existing --admin

# 2. Namespace
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# 3. StorageClass
kubectl apply -f k8s/storage/storageclass-retain.yaml

# 4. PVCs (si ja existeixen no fa res)
kubectl apply -f k8s/storage/elasticsearch-pvc.yaml
kubectl apply -f k8s/storage/grafana-pvc.yaml

# 5. ACR Secret
az acr login --name "${ACR%%.azurecr.io}"
kubectl create secret generic acr-secret \
  --from-file=.dockerconfigjson=$HOME/.docker/config.json \
  --type=kubernetes.io/dockerconfigjson \
  -n $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# 6. Deployments
for f in k8s/deployments/*.yaml; do
  kubectl apply -f $f -n $NAMESPACE
  echo "  -> $f"
done

# 7. Services
for f in k8s/services/*.yaml; do
  kubectl apply -f $f -n $NAMESPACE
  echo "  -> $f"
done

echo ""
echo "=== Esperant que tots els pods estiguin Ready ==="
kubectl wait --for=condition=ready pod --all -n $NAMESPACE --timeout=180s

echo ""
kubectl get pods -n $NAMESPACE
kubectl get svc -n $NAMESPACE
echo ""
echo "=== Bootstrap completat ==="
