#!/bin/bash
echo "=== Parant cluster AKS ==="
az aks stop --resource-group aks-tests --name apis-asincronas
echo "Cluster aturat. Els PVs amb Retain estan segurs."
