#!/bin/bash
set -e

ACR="feinaregistry.azurecr.io"
NAMESPACE="apis-asincronas"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Deploy APIs Asincrones ==="
echo "Directori: $REPO_DIR"

# Serveis que tenen imatge propia al ACR
SERVICES=("backstage" "catalog-service" "scenario-service" "benchmark-orchestrator" "metrics-api")

# 1. Login ACR
echo ""
echo "--- Login ACR ---"
az acr login --name feinaregistry

# 2. Build i push de cada servei
echo ""
echo "--- Build i Push imatges ---"

# Backstage (build des de l'arrel)
echo "Building backstage..."
docker build -t $ACR/backstage:latest -f Dockerfile $REPO_DIR
docker push $ACR/backstage:latest
echo "  -> backstage pushed"

# Microserveis
for svc in catalog-service scenario-service benchmark-orchestrator metrics-api; do
  if [ -f "$REPO_DIR/packages/$svc/Dockerfile" ]; then
    echo "Building $svc..."
    docker build -t $ACR/$svc:latest $REPO_DIR/packages/$svc
    docker push $ACR/$svc:latest
    echo "  -> $svc pushed"
  else
    echo "  !! Dockerfile no trobat per $svc, saltant..."
  fi
done

# 3. Rollout restart de tots els deployments
echo ""
echo "--- Rollout restart ---"
for svc in backstage catalog-service scenario-service benchmark-orchestrator metrics-api grafana elasticsearch; do
  kubectl rollout restart deployment/$svc -n $NAMESPACE
  echo "  -> $svc restarted"
done

# 4. Espera que tots estiguin Ready
echo ""
echo "--- Esperant pods ---"
kubectl rollout status deployment/backstage -n $NAMESPACE --timeout=180s
kubectl rollout status deployment/catalog-service -n $NAMESPACE --timeout=60s
kubectl rollout status deployment/scenario-service -n $NAMESPACE --timeout=60s
kubectl rollout status deployment/benchmark-orchestrator -n $NAMESPACE --timeout=60s
kubectl rollout status deployment/metrics-api -n $NAMESPACE --timeout=60s

# 5. Estat final
echo ""
echo "--- Estat final ---"
kubectl get pods -n $NAMESPACE
echo ""
echo "=== Deploy completat ==="
