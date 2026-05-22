#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-apis-asincrones}"
SERVICE="${SERVICE:-backstage-service}"
DEPLOYMENT="${DEPLOYMENT:-backstage}"

echo "Waiting for LoadBalancer IP on service/${SERVICE} in namespace ${NAMESPACE}..."

PUBLIC_IP=""
for _ in $(seq 1 60); do
  PUBLIC_IP="$(kubectl get svc "${SERVICE}" -n "${NAMESPACE}" -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)"
  if [[ -n "${PUBLIC_IP}" ]]; then
    break
  fi
  sleep 10
done

if [[ -z "${PUBLIC_IP}" ]]; then
  echo "ERROR: service/${SERVICE} has no external IP yet."
  kubectl get svc "${SERVICE}" -n "${NAMESPACE}" || true
  exit 1
fi

PUBLIC_URL="http://${PUBLIC_IP}"
echo "Configuring Backstage public URL: ${PUBLIC_URL}"

kubectl set env deployment/"${DEPLOYMENT}" -n "${NAMESPACE}" \
  APP_CONFIG_app_baseUrl="${PUBLIC_URL}" \
  APP_CONFIG_backend_baseUrl="${PUBLIC_URL}" \
  APP_CONFIG_backend_cors_origin="${PUBLIC_URL}"

kubectl rollout status deployment/"${DEPLOYMENT}" -n "${NAMESPACE}" --timeout=240s

echo "Backstage URL: ${PUBLIC_URL}"
