#!/bin/bash
# -----------------------------------------------------------------------------
# deploy-all.sh
#
# Full deploy pipeline for the APIs Asincrones Backstage portal and
# supporting microservices. Designed to run from Azure Cloud Shell
# (no local yarn/docker needed) using `az acr build` for cloud-side builds.
#
# Flow per service: az acr build -> kubectl rollout restart.
#
# Flags:
#   --only <svc>    Build+restart only one service (backstage, catalog-service,
#                   scenario-service, benchmark-orchestrator, metrics-api)
#   --no-restart    Build+push only, do not touch the cluster
#   --restart-only  Skip all builds, only restart the deployments (force pull
#                   :latest from ACR via imagePullPolicy: Always)
#   --help          Show this message
#
# Requires: az CLI (logged in), kubectl configured for the AKS.
# -----------------------------------------------------------------------------
set -e

ACR_NAME="feinaregistry"
ACR="${ACR_NAME}.azurecr.io"
NAMESPACE="apis-asincronas"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

ONLY=""
NO_RESTART=0
RESTART_ONLY=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --only) ONLY="$2"; shift 2 ;;
    --no-restart) NO_RESTART=1; shift ;;
    --restart-only) RESTART_ONLY=1; shift ;;
    --help|-h)
      sed -n '3,20p' "$0"; exit 0 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

echo "=== Deploy APIs Asincrones ==="
echo "Directori: $REPO_DIR"
[[ -n "$ONLY" ]] && echo "Mode: nomes $ONLY"
[[ $RESTART_ONLY -eq 1 ]] && echo "Mode: nomes restart (no build)"

# -----------------------------------------------------------------------------
# Service -> (Dockerfile path, build context) mapping.
# backstage uses a multi-stage Dockerfile under packages/backend/ and the
# build context must be the repo root so the Dockerfile can see all plugins.
# Microservices build from their own package directory.
# -----------------------------------------------------------------------------
declare -A DOCKERFILES
declare -A CONTEXTS
DOCKERFILES[backstage]="packages/backend/Dockerfile"
CONTEXTS[backstage]="."
for svc in catalog-service scenario-service benchmark-orchestrator metrics-api load-generator; do
  DOCKERFILES[$svc]="packages/$svc/Dockerfile"
  CONTEXTS[$svc]="packages/$svc"
done

# Build order. If --only is set, it's just that one.
# NOTE: load-generator is NOT a Deployment; it's an image pulled by
# Kubernetes Jobs spawned by benchmark-orchestrator at run time. Include
# it in BUILD_LIST but skip rollout restart (handled per-target below).
if [[ -n "$ONLY" ]]; then
  BUILD_LIST=("$ONLY")
else
  BUILD_LIST=(backstage catalog-service scenario-service benchmark-orchestrator metrics-api load-generator)
fi

# -----------------------------------------------------------------------------
# STEP 1: ACR build per service (skipped if --restart-only).
# `az acr build` uploads the source to ACR and builds the image there,
# so no local docker/yarn toolchain is required.
# -----------------------------------------------------------------------------
if [[ $RESTART_ONLY -eq 0 ]]; then
  echo ""
  echo "--- Build i Push imatges (az acr build) ---"
  cd "$REPO_DIR"
  for svc in "${BUILD_LIST[@]}"; do
    df="${DOCKERFILES[$svc]}"
    ctx="${CONTEXTS[$svc]}"
    if [[ ! -f "$REPO_DIR/$df" ]]; then
      echo "  !! Dockerfile no trobat: $df -> skipping $svc"
      continue
    fi
    echo ""
    echo "Building $svc  (dockerfile=$df  context=$ctx)"
    az acr build \
      --registry "$ACR_NAME" \
      --image "$svc:latest" \
      --file "$df" \
      "$ctx"
    echo "  -> $svc pushed to $ACR"
  done
fi

# -----------------------------------------------------------------------------
# STEP 2: rollout restart. `imagePullPolicy: Always` + `:latest` tag means
# the restart forces a fresh pull.
# -----------------------------------------------------------------------------
if [[ $NO_RESTART -eq 1 ]]; then
  echo ""
  echo "--- Skipping rollout (--no-restart) ---"
  echo "=== Build completat ==="
  exit 0
fi

echo ""
echo "--- Rollout restart ---"
if [[ -n "$ONLY" ]]; then
  TARGETS=("$ONLY")
else
  # grafana + elasticsearch dont have images built here but still restart
  # them so they pick up any config-map changes and new backend connections.
  TARGETS=(backstage catalog-service scenario-service benchmark-orchestrator metrics-api grafana elasticsearch)
fi
for svc in "${TARGETS[@]}"; do
  # load-generator runs as an on-demand Job, not a Deployment - skip rollout.
  if [[ "$svc" == "load-generator" ]]; then
    echo "  -> load-generator image pushed; no Deployment to restart (Job uses :latest on next run)"
    continue
  fi
  if ! kubectl get deployment/$svc -n "$NAMESPACE" >/dev/null 2>&1; then
    echo "  !! no deployment/$svc in namespace, skipping"
    continue
  fi
  kubectl rollout restart deployment/$svc -n "$NAMESPACE"
  echo "  -> $svc restarted"
done

# -----------------------------------------------------------------------------
# STEP 3: wait for rollouts to complete.
# -----------------------------------------------------------------------------
echo ""
echo "--- Esperant pods ---"
for svc in "${TARGETS[@]}"; do
  if ! kubectl get deployment/$svc -n "$NAMESPACE" >/dev/null 2>&1; then
    continue
  fi
  TIMEOUT=60s
  [[ "$svc" == "backstage" ]] && TIMEOUT=240s
  kubectl rollout status deployment/$svc -n "$NAMESPACE" --timeout=$TIMEOUT || true
done

# -----------------------------------------------------------------------------
# STEP 4: final state.
# -----------------------------------------------------------------------------
echo ""
echo "--- Estat final ---"
kubectl get pods -n "$NAMESPACE"
echo ""
echo "=== Deploy completat ==="
