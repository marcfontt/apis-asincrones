#!/bin/bash
echo "=== Arrencant cluster AKS ==="
az aks start --resource-group aks-tests --name apis-asincronas
echo "Esperant que el cluster estigui Ready..."
az aks wait --resource-group aks-tests --name apis-asincronas --updated --interval 30 --timeout 600
echo "Cluster llest. Executant bootstrap..."
cd ~/apis-asincrones
bash scripts/bootstrap.sh
