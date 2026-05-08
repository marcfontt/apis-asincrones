# Guia d'instal·lació al cluster AKS

Aquesta guia descriu pas a pas com desplegar el portal i tota la
infraestructura del benchmark d'APIs asíncrones sobre **Azure Kubernetes
Service (AKS)** des de zero.

Documents relacionats:

- [`../README.md`](../README.md) — Visió general del projecte
- [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) — Si alguna etapa falla
- [`architecture.mmd`](architecture.mmd) — Diagrama de serveis i ports

> **Nota**: Cada secció és una etapa independent. Si una etapa falla,
> consulta [TROUBLESHOOTING.md](TROUBLESHOOTING.md) abans de continuar.

---

## Contingut

1. [Prerequisits](#0-prerequisits)
2. [Variables d'entorn](#1-variables-dentorn)
3. [Crear cluster i registry](#2-opcional-crear-cluster-i-registry)
4. [Crear el namespace](#3-crear-el-namespace)
5. [Storage class de retenció](#4-aplicar-la-storage-class-de-retenció)
6. [Infraestructura bàsica](#5-aplicar-la-infraestructura-bàsica)
7. [Instal·lar brokers](#6-installar-els-brokers-de-missatgeria)
8. [Build i push d'imatges](#7-construir-i-pujar-les-imatges-dels-microserveis)
9. [Deployments dels microserveis](#8-aplicar-els-deployments-dels-microserveis)
10. [Verificació final](#9-verificació-final)

---

## 0. Prerequisits

Necessites les eines següents instal·lades i configurades:

| Eina | Versió mínima | Comprovació |
|------|---------------|-------------|
| `az` CLI | 2.50 | `az version` |
| `kubectl` | 1.28 | `kubectl version --client` |
| `helm` | 3.x | `helm version` |
| Docker | 24 | `docker version` |

A més:

- Subscripció Azure amb permisos per crear AKS, ACR i discos gestionats
- Credencials per al cluster (`az aks get-credentials`)
- Accés a Azure Container Registry (ACR) per pujar imatges

---

## 1. Variables d'entorn

Omple i exporta les variables una vegada; les etapes posteriors les reutilitzen:

```bash
export AZ_RG="rg-async-benchmarks"
export AZ_LOCATION="westeurope"
export AKS_NAME="async-benchmarks-aks"
export ACR_NAME="asyncbenchmarkregistry"
export ACR="${ACR_NAME}.azurecr.io"
export NS="apis-asincrones"
```

---

## 2. (Opcional) Crear cluster i registry des de zero

> **Salta aquesta etapa** si ja tens un cluster AKS i un ACR existents.

```bash
# Resource group
az group create --name "$AZ_RG" --location "$AZ_LOCATION"

# Container Registry
az acr create --resource-group "$AZ_RG" --name "$ACR_NAME" --sku Basic

# Cluster AKS amb attachment a l'ACR (evita haver de gestionar imagePullSecrets)
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

Comprova que el namespace existeix:

```bash
kubectl get namespace "$NS"
```

---

## 4. Aplicar la storage class de retenció

Les PVCs del projecte (Elasticsearch i Grafana) fan servir `azure-retain`,
una storage class personalitzada que **no destrueix el disc** quan
s'esborra la PVC. S'ha d'aplicar una sola vegada.

```bash
kubectl apply -f k8s/storage/storageclass-retain.yaml
```

Comprova que s'ha creat:

```bash
kubectl get storageclass azure-retain
```

---

## 5. Aplicar la infraestructura bàsica

L'ordre importa: storage → secrets → configmaps → rbac → deployments → services.

```bash
# 5.1 PersistentVolumeClaims (Elasticsearch, Grafana)
kubectl apply -f k8s/storage/

# 5.2 Secrets i ConfigMaps
kubectl apply -f k8s/deployments/grafana-provisioning.yaml   # dashboards i datasource
kubectl apply -f k8s/deployments/grafana-secret.yaml         # password admin
kubectl apply -f k8s/brokers/nats-config.yaml                # max_payload=4MB

# 5.3 RBAC (ServiceAccount + Role per al benchmark-orchestrator)
kubectl apply -f k8s/rbac/

# 5.4 Deployments d'infraestructura
kubectl apply -f k8s/deployments/elasticsearch.yaml
kubectl apply -f k8s/deployments/grafana.yaml

# 5.5 Services (ClusterIP interns + LoadBalancers externs)
kubectl apply -f k8s/services/
```

Espera que els pods estiguin `Running`:

```bash
kubectl get pods -w
# Espera STATUS=Running i READY=1/1 per a elasticsearch i grafana
```

---

## 6. Instal·lar els brokers de missatgeria

### 6.1 Apache Kafka via Strimzi

```bash
# Crea el namespace de Strimzi i instal·la l'operador
kubectl create namespace kafka-strimzi
kubectl create -f 'https://strimzi.io/install/latest?namespace=kafka-strimzi' \
  -n kafka-strimzi

# Espera que l'operador estigui Running (pot trigar 1-2 min)
kubectl get pods -n kafka-strimzi -w

# Desplega el cluster Kafka (KRaft mode, sense Zookeeper)
kubectl apply -f k8s/kafka/kafkanodepool.yaml -n kafka-strimzi
kubectl apply -f k8s/kafka/kafka-cluster.yaml -n kafka-strimzi

# Espera que el cluster Kafka estigui Ready
kubectl get kafka -n kafka-strimzi -w
```

### 6.2 NATS Server

```bash
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update

helm install nats nats/nats -n brokers --create-namespace \
  --set-string config.merge.max_payload='<< 4MB >>'
```

> ⚠️ **Important**: NATS té un límit per defecte de 1 MB per missatge.
> El format `video-8k` genera payloads de ~2 MB, de manera que **sense**
> el `max_payload=4MB` tots els runs de NATS + vídeo 8K fallaran amb
> `NATS_MAX_PAYLOAD_EXCEEDED`. Vegeu [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

### 6.3 RabbitMQ

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm install rabbitmq bitnami/rabbitmq -n brokers \
  --set auth.username=admin \
  --set auth.password=BenchmarkAdmin2024
```

### 6.4 Redpanda (compatible amb l'API Kafka)

```bash
helm repo add redpanda https://charts.redpanda.com/
helm repo update

helm install redpanda redpanda/redpanda -n brokers \
  --set storage.persistentVolume.size=5Gi
```

Verifica que tots els pods dels brokers estan Running:

```bash
kubectl get pods -n brokers
kubectl get pods -n kafka-strimzi
```

---

## 7. Construir i pujar les imatges dels microserveis

El script `deploy-all.sh` automatitza tot el cicle de build via `az acr build`
(sense Docker local) i el restart dels Deployments:

```bash
# Build i push de TOTES les imatges + restart dels deployments
./deploy-all.sh

# Build i push d'un sol servei
./deploy-all.sh --only catalog-service

# Només restart (les imatges ja estan al ACR)
./deploy-all.sh --restart-only
```

Per fer-ho manualment per a un servei concret:

```bash
az acr build \
  --registry "$ACR_NAME" \
  --image catalog-service:latest \
  --file packages/catalog-service/Dockerfile \
  packages/catalog-service
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

Espera que tots els pods estiguin `Running`:

```bash
kubectl get pods
# Tots haurien de mostrar STATUS=Running i READY=1/1
```

---

## 9. Verificació final

```bash
# IP pública del portal Backstage (LoadBalancer)
kubectl get svc backstage-service
# Obre: http://<EXTERNAL-IP>/home

# IP pública de Grafana
kubectl get svc grafana-service

# Health checks individuals
kubectl exec deployment/metrics-api -- wget -qO- http://localhost:3004/health
kubectl exec deployment/catalog-service -- wget -qO- http://localhost:3001/health
kubectl exec deployment/elasticsearch -- curl -s http://localhost:9200/_cluster/health

# Logs d'un servei (últimes 50 línies)
kubectl logs deployment/metrics-api --tail=50
kubectl logs deployment/benchmark-orchestrator --tail=50
```

El sistema està llest quan el portal és accessible a `http://<IP-EXTERNAL>/home`
i pots crear i executar escenaris des de la pestanya **Escenaris**.

---

## Problemes habituals

Consulta [TROUBLESHOOTING.md](TROUBLESHOOTING.md) per als errors més comuns:

| Error | Secció |
|-------|--------|
| `ImagePullBackOff` | Build i compilació → Imatge Docker amb errors |
| `NATS_MAX_PAYLOAD_EXCEEDED` | Brokers → NATS rebutja missatges grans |
| Elasticsearch `CrashLoopBackOff` | Build i compilació |
| Grafana no veu Elasticsearch | Observabilitat |
| Catàleg buit després de desplegar | Catàleg → Catàleg apareix buit |
