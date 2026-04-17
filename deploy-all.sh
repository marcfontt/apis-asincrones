#!/bin/bash
# -----------------------------------------------------------------------------
# deploy-all.sh
#
# Full deploy pipeline for the APIs Asincrones Backstage portal and
# supporting microservices. Run from the repo root after any source
# change to rebuild images, push to ACR, and restart all pods.
#
# Flags:
#   --skip-build       Skip the yarn tsc + yarn build:backend step
#                      (use when you only changed microservices, not Backstage)
#   --only <svc>       Build and push only one service, then restart only that
#                      deployment (e.g. --only backstage, --only metrics-api)
#   --no-restart       Build + push only, do not touch the cluster
#   --help             Show this message
#
# Requires: yarn, az cli, docker (running), kubectl configured for the AKS.
# -----------------------------------------------------------------------------
set -e

ACR="feinaregistry.azurecr.io"
NAMESPACE="apis-asincronas"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

SKIP_BUILD=0
ONLY=""
NO_RESTART=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=1; shift ;;
    --only) ONLY="$2"; shift 2 ;;
    --no-restart) NO_RESTART=1; shift ;;
    --help|-h)
      sed -n '3,16p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

echo "=== Deploy APIs Asincrones ==="
echo "Directori: $REPO_DIR"
[[ -n "$ONLY" ]] && echo "Mode: nomes $ONLY"

# -----------------------------------------------------------------------------
# STEP 0: Rebuild the Backstage frontend+backend bundle.
# The backend Dockerfile does NOT compile TypeScript - it just packages
# packages/backend/dist/bundle.tar.gz. So a fresh build here is MANDATORY
# whenever plugins/feina/src/* changes, or the deployed image will contain
# stale code even after rollout.
# -----------------------------------------------------------------------------
if [[ $SKIP_BUILD -eq 0 ]] && { [[ -z "$ONLY" ]] || [[ "$ONLY" == "backstage" ]]; }; then
  echo ""
  echo "--- Build local backstage (yarn tsc + build:backend) ---"
  cd "$REPO_DIR"
  yarn tsc
  yarn build:backend
  echo "  -> packages/backend/dist/bundle.tar.gz fresh"
fi

# 1. Login ACR
echo ""
echo "--- Login ACR ---"
az acr login --name feinaregistry

# 2. Build i push de cada servei
echo ""
echo "--- Build i Push imatges ---"

# Backstage (build des de l'arrel) - skip if --only is set to something else
if [[ -z "$ONLY" ]] || [[ "$ONLY" == "backstage" ]]; then
  echo "Building backstage..."
  docker build -t $ACR/backstage:latest -f packages/backend/Dockerfile $REPO_DIR
  docker push $ACR/backstage:latest
  echo "  -> backstage pushed"
fi

# Microserveis
for svc in catalog-service scenario-service benchmark-orchestrator metrics-api; do
  # Respect --only filter
  if [[ -n "$ONLY" ]] && [[ "$ONLY" != "$svc" ]]; then continue; fi
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
if [[ $NO_RESTART -eq 1 ]]; then
  echo ""
  echo "--- Skipping rollout (--no-restart) ---"
  echo "=== Build completat ==="
  exit 0
fi

echo ""
echo "--- Rollout restart ---"
# List of deployments to restart. If --only was used, only that one.
if [[ -n "$ONLY" ]]; then
  TARGETS=("$ONLY")
else
  # grafana and elasticsearch don't have images built here but we still
  # restart them so they re-mount any updated config and get fresh connections.
  TARGETS=(backstage catalog-service scenario-service benchmark-orchestrator metrics-api grafana elasticsearch)
fi
for svc in "${TARGETS[@]}"; do
  kubectl rollout restart deployment/$svc -n $NAMESPACE 2>/dev/null || {
    echo "  !! no deployment/$svc in namespace, skipping"
    continue
  }
  echo "  -> $svc restarted"
done

# 4. Espera que tots estiguin Ready
echo ""
echo "--- Esperant pods ---"
for svc in "${TARGETS[@]}"; do
  # 180s for backstage (big image), 60s for the rest
  TIMEOUT=60s
  [[ "$svc" == "backstage" ]] && TIMEOUT=180s
  kubectl rollout status deployment/$svc -n $NAMESPACE --timeout=$TIMEOUT 2>/dev/null || true
done

# 5. Estat final
echo ""
echo "--- Estat final ---"
kubectl get pods -n $NAMESPACE
echo ""
echo "=== Deploy completat ==="
