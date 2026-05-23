# Guia operativa AKS Azure for Students

Document de treball per reconstruir, arrencar, aturar i validar la plataforma
del PFG en la subscripcio Azure for Students.

## Variables base

Executa-ho sempre al principi d'una sessio de Cloud Shell:

```powershell
$SUB = "8d03409f-c1a1-4c4f-ae16-f41c58f44609"
$RG = "rg-apis-asincrones-pfg"
$AKS = "aks-apis-asincrones-pfg"
$ACR = "asyncpfg65454"
$NS_APP = "apis-asincrones"
$NS_BROKERS = "brokers"
```

## 1. Recuperar sessio de Cloud Shell

Si Cloud Shell diu que no estas autenticat:

```powershell
az login --identity
az account set --subscription $SUB
az account show -o table
```

Si `kubectl` diu `You must be logged in to the server`:

```powershell
az aks get-credentials `
  --resource-group $RG `
  --name $AKS `
  --overwrite-existing

kubectl get nodes
```

## 2. Arrencar el cluster despres d'haver-lo apagat

```powershell
az login --identity
az account set --subscription $SUB

az aks start `
  --resource-group $RG `
  --name $AKS

az aks get-credentials `
  --resource-group $RG `
  --name $AKS `
  --overwrite-existing

kubectl get nodes
kubectl get pods -n $NS_APP
kubectl get pods -n $NS_BROKERS
```

Si els pods queden en `ImagePullBackOff`, refresca el secret de l'ACR:

```powershell
$ACR_USER = (az acr credential show -n $ACR --query username -o tsv).Trim()
$ACR_PASS = (az acr credential renew -n $ACR --password-name password --query "passwords[0].value" -o tsv).Trim()
az acr credential renew -n $ACR --password-name password2 -o none

kubectl create secret docker-registry acr-secret `
  --namespace $NS_APP `
  --docker-server "$ACR.azurecr.io" `
  --docker-username $ACR_USER `
  --docker-password $ACR_PASS `
  --dry-run=client -o yaml | kubectl apply -f -
```

## 3. Aplicar manifests des de zero

```powershell
cd ~/apis-asincrones
git pull origin main

kubectl create namespace $NS_APP --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace $NS_BROKERS --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f k8s/storage/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/rbac/
kubectl apply -f k8s/brokers/

kubectl apply -f 'https://strimzi.io/install/latest?namespace=brokers' -n brokers
kubectl wait deployment/strimzi-cluster-operator -n brokers --for=condition=Available --timeout=300s
kubectl apply -f k8s/kafka/
```

Si Strimzi ja estava instal.lat, `kubectl apply` simplement actualitza el que
calgui. Continua sempre validant l'operador i el Kafka:

```powershell
kubectl wait deployment/strimzi-cluster-operator -n brokers --for=condition=Available --timeout=300s
kubectl apply -f k8s/kafka/
```

## 4. Validar serveis abans d'executar proves

```powershell
kubectl get pods -n $NS_APP
kubectl get pods,svc,endpoints -n $NS_BROKERS
kubectl get kafka,kafkanodepool -n $NS_BROKERS
```

Han d'estar llestos, com a minim:

```text
apis-asincrones/backstage                Running
apis-asincrones/catalog-service          Running
apis-asincrones/scenario-service         Running
apis-asincrones/metrics-api              Running
apis-asincrones/elasticsearch            Running
apis-asincrones/benchmark-orchestrator   Running
brokers/rabbitmq                         Running si proves RabbitMQ
brokers/nats                             Running si proves NATS
brokers/kafka-cluster-dual-role-0        Running si proves Kafka o Confluent
```

Grafana pot estar a `0 replicas` quan no es fa observabilitat per alliberar
recursos del node.

## 5. Perfil comparable de brokers

Per comparar rendiment, els brokers del repo fan servir el mateix sostre:

| Broker | CPU | Memoria | QoS |
|---|---:|---:|---|
| Kafka | `300m` | `768Mi` | Guaranteed |
| RabbitMQ | `300m` | `768Mi` | Guaranteed |
| NATS | `300m` | `768Mi` | Guaranteed |

Aixo no vol dir que les mesures finals hagin de llançar runs paral.lels. Amb
tres nodes es pot tenir Kafka, RabbitMQ i NATS aixecats alhora per demo i
validacio, pero les proves finals continuen sent serials: un run cada vegada,
Grafana aturat excepte quan cal captura, mateixa carrega i mateix warm-up.

El `load-generator` tambe s'ha de controlar. Si cau aleatoriament al node del
broker en una prova i en una altra no, la comparativa queda contaminada. Per
aixo el `benchmark-orchestrator` pot fixar tots els Jobs de carrega a un node
amb l'etiqueta `benchmark-role=loadgen`.

Exemple amb el node menys carregat:

```powershell
kubectl label node aks-nodepool1-10848180-vmss000002 benchmark-role=loadgen --overwrite
kubectl apply -f k8s/deployments/benchmark-orchestrator.yaml
kubectl rollout status deployment/benchmark-orchestrator -n $NS_APP --timeout=180s
```

El manifest deixa `MAX_CONCURRENT_RUNS=1`: pots crear molts runs des del portal,
pero l'orquestrador nomes desplega un Job de benchmark cada vegada. La resta
queden en cua fins que el Job actiu acaba. No executis 16 Jobs simultanis al
mateix node de carrega si vols resultats defensables; si apareixen pods
`Pending` sense node assignat, no generaran metriques fins que Kubernetes els
pugui programar.

Abans de donar per valida una prova, comprova on ha caigut el Job:

```powershell
kubectl get pods -A -o wide | Select-String "benchmark|load-generator|sc-"
```

Si el `load-generator` no esta al node etiquetat, aquell run no s'ha de fer
servir com a resultat final.

Preparar RabbitMQ:

```powershell
kubectl scale deployment/grafana -n $NS_APP --replicas=0
kubectl scale deployment/nats -n $NS_BROKERS --replicas=0
kubectl apply -f k8s/brokers/rabbitmq.yaml
kubectl rollout status deployment/rabbitmq -n $NS_BROKERS --timeout=240s
kubectl get endpoints rabbitmq -n $NS_BROKERS
```

Preparar NATS:

```powershell
kubectl scale deployment/grafana -n $NS_APP --replicas=0
kubectl scale deployment/rabbitmq -n $NS_BROKERS --replicas=0
kubectl apply -f k8s/brokers/nats-config.yaml
kubectl apply -f k8s/brokers/nats.yaml
kubectl rollout status deployment/nats -n $NS_BROKERS --timeout=180s
kubectl get endpoints nats nats-headless -n $NS_BROKERS
```

Preparar Kafka:

```powershell
kubectl scale deployment/grafana -n $NS_APP --replicas=0
kubectl scale deployment/nats -n $NS_BROKERS --replicas=0
kubectl scale deployment/rabbitmq -n $NS_BROKERS --replicas=0
kubectl apply -f k8s/kafka/
kubectl wait kafka/kafka-cluster -n $NS_BROKERS --for=condition=Ready --timeout=600s
kubectl get endpoints kafka-cluster-kafka-bootstrap -n $NS_BROKERS
```

## 6. Configurar la URL publica de Backstage

```powershell
bash scripts/configure-backstage-public-url.sh
kubectl get svc backstage-service -n $NS_APP
```

El script actualitza `APP_CONFIG_app_baseUrl`,
`APP_CONFIG_backend_baseUrl` i CORS amb la IP del LoadBalancer.

## 7. Build d'imatges

En Azure for Students, `az acr build` pot fallar amb `TasksOperationsNotAllowed`.
El cami correcte es:

1. GitHub -> repo `marcfontt/apis-asincrones`.
2. `Settings` -> `Secrets and variables` -> `Actions`.
3. Secrets:
   - `ACR_USERNAME`
   - `ACR_PASSWORD`
4. `Actions` -> `Build ACR images` -> `Run workflow`.

Quan el workflow acabi:

```powershell
git pull origin main
kubectl apply -f k8s/deployments/
./deploy-all.sh --restart-only
```

## 8. Executar una prova i comprovar que genera mesures

1. Obre el portal Backstage.
2. Ves a `Escenaris`.
3. Executa primer un escenari petit:
   - RabbitMQ financer fiable, si `rabbitmq` esta `Running`.
   - Kafka control base, si Kafka esta `Ready`.
   - NATS telemetria IoT, si `nats` esta `Running`.
4. Ves a `Resultats` -> `En directe`.

Comandes de verificacio mentre corre:

```powershell
kubectl get jobs -A
kubectl get namespaces | Select-String "sc-"
kubectl logs -n $NS_APP deployment/benchmark-orchestrator --tail=120
kubectl logs -n $NS_APP deployment/metrics-api --tail=120
```

Per trobar el namespace efimer del run:

```powershell
kubectl get ns -o name | Select-String "namespace/sc-"
```

Quan tinguis el namespace, per exemple `sc-rabbitmq-financer-fiable-abc123`:

```powershell
$RUN_NS = "sc-rabbitmq-financer-fiable-abc123"
kubectl get pods,jobs -n $RUN_NS
kubectl describe pod -n $RUN_NS -l job-name
kubectl logs -n $RUN_NS -l job-name --tail=150
```

Si Resultats mostra `0 mesures`, mira aquests punts en aquest ordre:

```powershell
kubectl get endpoints -n $NS_BROKERS
kubectl get jobs -A
kubectl get pods -A | Select-String "benchmark|load|sc-"
kubectl logs -n $NS_APP deployment/benchmark-orchestrator --tail=150
kubectl logs -n $NS_APP deployment/metrics-api --tail=150
```

Interpretacio rapida:

| Signe | Causa probable | Accio |
|---|---|---|
| `BROKER_NOT_READY` | Broker sense endpoints | Arrenca/aplica el broker corresponent. |
| Job `Pending` | CPU/memoria insuficient | Escala Grafana a 0 i evita executar diversos brokers pesats alhora. |
| Job `Error` o `CrashLoopBackOff` | Fallada del load-generator | Revisa logs del namespace `sc-*`. |
| Metrics API amb error ES | Elasticsearch no llest | Revisa `kubectl logs deployment/elasticsearch`. |

## 9. Grafana pas a pas

Arrencar Grafana:

```powershell
kubectl scale deployment/grafana -n $NS_APP --replicas=1
kubectl rollout status deployment/grafana -n $NS_APP --timeout=180s
```

Llegir usuari i contrasenya:

```powershell
kubectl get secret grafana-admin -n $NS_APP -o jsonpath="{.data.user}" | base64 -d
echo
kubectl get secret grafana-admin -n $NS_APP -o jsonpath="{.data.password}" | base64 -d
echo
```

Obrir Grafana:

```powershell
kubectl port-forward -n $NS_APP svc/grafana 3000:3000
```

Al navegador:

```text
http://127.0.0.1:3000
```

Validacio dins de Grafana:

1. Login amb l'usuari i contrasenya del Secret.
2. Ves a `Connections` -> `Data sources`.
3. Comprova que existeix `Elasticsearch (metriques benchmark)`.
4. Entra al datasource i prem `Save & test`.
5. Ves a `Explore`.
6. Selecciona el datasource d'Elasticsearch.
7. Consulta l'index `async-metrics`.
8. Filtra per `runId` si vols contrastar una execucio concreta.

Quan acabis, si necessites recursos:

```powershell
kubectl scale deployment/grafana -n $NS_APP --replicas=0
```

## 10. Apagar per reduir cost

Abans d'apagar, atura execucions en curs des del portal o elimina namespaces
efimers si han quedat penjats:

```powershell
kubectl get ns -o name | Select-String "namespace/sc-"
```

Per cada namespace `sc-*` que no necessitis:

```powershell
kubectl delete namespace <namespace-sc>
```

Apagar AKS:

```powershell
az aks stop `
  --resource-group $RG `
  --name $AKS
```

Comprovar:

```powershell
az aks show `
  --resource-group $RG `
  --name $AKS `
  --query "{name:name,powerState:powerState.code,provisioningState:provisioningState}" `
  -o table
```

## 11. Captures per a la memoria i annex

Captures recomanades:

1. Azure: vista general del AKS nou amb subscripcio Azure for Students.
2. Azure: node pool `Standard_B2s_v2`.
3. Azure: ACR `asyncpfg65454.azurecr.io`.
4. GitHub Actions: workflow `Build ACR images` completat.
5. Cloud Shell: `kubectl get pods -n apis-asincrones`.
6. Cloud Shell: `kubectl get pods,svc,endpoints -n brokers`.
7. Backstage Home amb URL publica.
8. Backstage Cataleg.
9. Backstage Escenaris amb escenari petit seleccionat.
10. Backstage Execucions amb un run completat.
11. Backstage Resultats amb mostres visibles.
12. Grafana datasource Elasticsearch validat.
13. Grafana Explore amb `async-metrics`.

Aquestes captures haurien d'anar a l'annex si fan massa soroll al cos principal.
Al cos del document deixa nomes les figures que expliquen arquitectura, flux
d'execucio i resultat final.
