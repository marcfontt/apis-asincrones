# Guia d'instal·lació al cluster AKS

Aquesta guia descriu pas a pas com posar el portal i tota la
infraestructura de benchmark en marxa a Azure Kubernetes Service.
Va ben acompanyada de:

- [`../k8s/README.md`](../k8s/README.md) — visió de cada manifest
- [`../README.md`](../README.md) — visió general del projecte

> Format: cada secció és una **etapa**. Si una etapa falla, abans de
> passar a la següent llegeix el bloc **Què pot fallar i com resoldre-ho**
> al final del document.

---

## 0. Prerequisits

Necessites:

| Eina       | Versió mínima  | Comprovació              |
|------------|----------------|--------------------------|
| `az` CLI   | 2.50           | `az version`             |
| `kubectl`  | 1.28           | `kubectl version`        |
| Docker     | 24             | `docker version` (per builds locals; `az acr build` fa servir Docker remot) |
| Subscripció Azure amb permisos per crear AKS, ACR i discos. |
| Credencials per al cluster (`az aks get-credentials`).      |

---

## 1. Variables d'entorn (omple-les una vegada)

```bash
export AZ_RG="rg-async-benchmarks"
export AZ_LOCATION="westeurope"
export AKS_NAME="async-benchmarks-aks"
export ACR_NAME="asyncbenchmarkregistry"
export ACR="${ACR_NAME}.azurecr.io"
export NS="apis-asincronas"
```

---

## 2. (Opcional) Crear cluster i registry des de zero

> **Salta-ho** si ja tens un cluster i un ACR.

```bash
# Resource group
az group create --name "$AZ_RG" --location "$AZ_LOCATION"

# Container registry
az acr create --resource-group "$AZ_RG" --name "$ACR_NAME" --sku Basic

# AKS amb attachment a l'ACR (no cal gestionar imagePullSecrets si fem attach)
az aks create \
  --resource-group "$AZ_RG" \
  --name "$AKS_NAME" \
  --node-count 3 \
  --enable-managed-identity \
  --attach-acr "$ACR_NAME"

# Configurar kubectl per parlar amb l'AKS
az aks get-credentials --resource-group "$AZ_RG" --name "$AKS_NAME"
```

---

## 3. Crear el namespace

```bash
kubectl create namespace "$NS"
kubectl config set-context --current --namespace "$NS"
```

---

## 4. Aplicar l'storage class de retenció (només una vegada)

Les PVCs del projecte (Elasticsearch i Grafana) usen `azure-retain`,
una storage class personalitzada que **no destrueix el disc** quan
s'esborra la PVC.

```bash
kubectl apply -f k8s/storage/storageclass-retain.yaml
```

---

## 5. Aplicar la infraestructura bàsica

L'ordre importa: storage → secrets → configmaps → deployments → services → rbac.

```bash
# 5.1 PVCs
kubectl apply -f k8s/storage/

# 5.2 Configmaps i Secrets (Grafana provisioning + admin password,
#     ConfigMap del NATS amb max_payload=4MB)
kubectl apply -f k8s/deployments/grafana-provisioning.yaml
kubectl apply -f k8s/deployments/grafana-secret.yaml
kubectl apply -f k8s/brokers/nats-config.yaml

# 5.3 Permisos del benchmark-orchestrator (ServiceAccount + Role per crear Jobs)
kubectl apply -f k8s/rbac/

# 5.4 Deployments d'infra (ES, Grafana)
kubectl apply -f k8s/deployments/elasticsearch.yaml
kubectl apply -f k8s/deployments/grafana.yaml

# 5.5 Services (ClusterIP per als interns; LoadBalancer per als externs)
kubectl apply -f k8s/services/
```

Comprova que pugen:

```bash
kubectl get pods -w
```

Espera fins a `STATUS=Running` i `READY=1/1` per `elasticsearch` i `grafana`.

---

## 6. Instal·lar els brokers de missatgeria

### 6.1 Apache Kafka via Strimzi

```bash
# Operador Strimzi al seu propi namespace
kubectl create namespace kafka-strimzi
kubectl create -f 'https://strimzi.io/install/latest?namespace=kafka-strimzi' -n kafka-strimzi

# El nostre cluster Kafka
kubectl apply -f k8s/kafka/kafkanodepool.yaml -n kafka-strimzi
kubectl apply -f k8s/kafka/kafka-cluster.yaml -n kafka-strimzi

# Espera fins que els pods estiguin Ready
kubectl get kafka -n kafka-strimzi -w
```

### 6.2 NATS Server

Si fas servir Helm (recomanat):

```bash
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update
helm install nats nats/nats -n brokers --create-namespace \
  --set-string config.merge.max_payload='<< 4MB >>'
```

> ⚠️ **Important per al format `video-8k`** (~2 MB de payload):
> NATS per defecte limita els missatges a 1 MB. Si no apliques el
> `max_payload=4MB`, els runs de NATS + video-8k fallaran amb
> `NATS_MAX_PAYLOAD_EXCEEDED`. Vegeu el bloc de troubleshooting més avall.

### 6.3 RabbitMQ

```bash
# RabbitMQ amb plugin de management
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install rabbitmq bitnami/rabbitmq -n brokers \
  --set auth.username=admin \
  --set auth.password=BenchmarkAdmin2024
```

### 6.4 Confluent (Redpanda Kafka-compatible)

```bash
helm repo add redpanda https://charts.redpanda.com/
helm install redpanda redpanda/redpanda -n brokers --set storage.persistentVolume.size=5Gi
```

---

## 7. Construir i pujar les imatges dels microserveis

Hi ha un script `deploy-all.sh` que automatitza tot el cicle de build amb
`az acr build` i el restart dels Deployments:

```bash
# Build i push de TOTES les imatges + restart
./deploy-all.sh

# Build només d'un servei
./deploy-all.sh --only catalog-service

# Saltar build (si ja tens les imatges al ACR), només restart
./deploy-all.sh --restart-only
```

Per fer-ho a mà:

```bash
az acr build --registry "$ACR_NAME" --image catalog-service:latest \
  --file packages/catalog-service/Dockerfile packages/catalog-service
```

---

## 8. Aplicar els Deployments dels microserveis

```bash
kubectl apply -f k8s/deployments/catalog-service.yaml
kubectl apply -f k8s/deployments/scenario-service.yaml
kubectl apply -f k8s/deployments/benchmark-orchestrator.yaml
kubectl apply -f k8s/deployments/metrics-api.yaml
kubectl apply -f k8s/deployments/backstage.yaml
```

Espera que tots estiguin `Running`:

```bash
kubectl get pods
```

---

## 9. Comprovar que tot funciona

```bash
# IP pública del portal (LoadBalancer)
kubectl get svc backstage-service

# Logs d'un servei
kubectl logs deployment/metrics-api --tail=50

# Health checks
kubectl exec deployment/metrics-api -- wget -qO- http://localhost:3004/health
kubectl exec deployment/elasticsearch -- curl -s http://localhost:9200/_cluster/health
```

Obre el portal a `http://<IP-EXTERN>/home`.

---

## Què pot fallar i com resoldre-ho

### `ImagePullBackOff`

El pod no pot baixar la imatge de l'ACR.
- Comprova que l'AKS està lligat a l'ACR: `az aks check-acr -n $AKS_NAME -g $AZ_RG --acr $ACR`.
- Si no, refeix l'attach: `az aks update -n $AKS_NAME -g $AZ_RG --attach-acr $ACR_NAME`.

### Elasticsearch en `CrashLoopBackOff` amb error `max virtual memory areas vm.max_map_count`

El nostre manifest ja inclou un initContainer privilegiat que ho posa,
però en algunes AKS bloquegen `privileged: true`. Solucions:

1. Posa-ho al node host (necessites un DaemonSet privileged).
2. O usa un node pool que ho permeti.

### Grafana arrenca però no veu Elasticsearch

- Comprova el ConfigMap: `kubectl get cm grafana-provisioning -o yaml`.
- Reinicia: `kubectl rollout restart deployment/grafana`.
- Mira els logs: `kubectl logs deploy/grafana | grep -i datasource`.

### Run NATS + video-8k falla amb `NATS_MAX_PAYLOAD_EXCEEDED`

És el bug més confús per a usuaris nous. Passa quan el `max_payload`
del NATS Server no s'ha pujat per damunt dels 2 MB del payload de
vídeo 8K.

```bash
# Si vas instal·lar NATS via Helm
helm upgrade nats nats/nats -n brokers --reuse-values \
  --set-string config.merge.max_payload='<< 4MB >>'

# Si vas fer-ho via ConfigMap
kubectl apply -f k8s/brokers/nats-config.yaml
kubectl rollout restart statefulset/nats -n brokers   # o deployment, segons el chart
```

Verifica el nou límit amb el port de monitoratge del servei headless:

```bash
kubectl port-forward -n brokers svc/nats-headless 8222:8222
curl -s http://127.0.0.1:8222/varz | grep max_payload
# Esperat: "max_payload": 4194304
```

### El portal carrega però `Resultats` està buit

- Comprova que `metrics-api` rep dades:
  `kubectl logs deploy/metrics-api | grep POST`.
- Comprova que ES té documents:
  `kubectl exec deploy/elasticsearch -- curl -s http://localhost:9200/async-metrics/_count`.
- Si tot està buit, llança un escenari curt des del portal i mira els
  logs del Job de load-generator que apareix al namespace `sc-*`.

### El Job del load-generator no arrenca

- `kubectl get jobs -A | grep benchmark-` per veure els últims jobs.
- `kubectl describe job <nom>` mostra l'error (sovint `imagePullBackOff`).
- Comprova que l'orchestrator ha pogut copiar el Secret `acr-secret`
  al namespace efímer:
  `kubectl get secrets -n sc-<slug>-<id>`.

### Mode indefinit s'atura després de N minuts

A la versió actual, "indefinit" vol dir realment indefinit (`duration=0`).
Si veus que s'atura, comprova:

- L'orchestrator: `kubectl logs deploy/benchmark-orchestrator | grep <runId>`.
- El Pod del load-generator: si ha mort per OOM (`OOMKilled`), augmenta
  els límits de memòria del job a `DATA_FORMAT_CONFIG` (a
  `packages/benchmark-orchestrator/src/index.ts`).

### Filtre d'execucions no mostra res

Sovint és perquè els runs antics tenen el camp `platform` buit. Solució:

- Aplica un filtre menys restrictiu (només per format).
- O esborra els runs antics amb el botó "Reinicia tot" a Execucions.
