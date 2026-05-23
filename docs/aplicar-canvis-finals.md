# Aplicar els canvis finals al cluster

Aquest document resumeix el cami curt per passar el commit final del repositori
al cluster AKS d'Azure for Students.

## 1. Construir imatges

Com que Azure for Students pot bloquejar `az acr build`, el cami recomanat es
fer-ho des de GitHub:

1. Obre el repositori `marcfontt/apis-asincrones`.
2. Ves a `Actions`.
3. Obre el workflow `Build ACR images`.
4. Clica `Run workflow`.
5. Tria la branca `main`.
6. Espera que el workflow acabi correctament.

Aquest pas es necessari per veure els canvis de frontend i de
`benchmark-orchestrator`, perque els manifests usen imatges `:latest`.

## 2. Aplicar manifests i reiniciar serveis

Executa-ho a Azure Cloud Shell:

```powershell
$SUB = "8d03409f-c1a1-4c4f-ae16-f41c58f44609"
$RG = "rg-apis-asincrones-pfg"
$AKS = "aks-apis-asincrones-pfg"
$NS_APP = "apis-asincrones"

az account set --subscription $SUB
az aks get-credentials `
  --resource-group $RG `
  --name $AKS `
  --overwrite-existing

cd ~/apis-asincrones
git pull origin main

kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/rbac/
kubectl apply -f k8s/kafka/

kubectl rollout restart deployment/backstage deployment/benchmark-orchestrator -n $NS_APP
kubectl rollout status deployment/backstage -n $NS_APP --timeout=240s
kubectl rollout status deployment/benchmark-orchestrator -n $NS_APP --timeout=180s
kubectl wait kafka/kafka-cluster -n brokers --for=condition=Ready --timeout=600s
```

## 3. Comprovar configuracio

```powershell
kubectl get deployment/benchmark-orchestrator -n $NS_APP `
  -o jsonpath='{range .spec.template.spec.containers[0].env[*]}{.name}={.value}{"`n"}{end}'

kubectl logs -n $NS_APP deployment/benchmark-orchestrator --tail=40
```

Ha d'apareixer:

```text
MAX_CONCURRENT_RUNS=3
KAFKA_BROKERS=kafka-cluster-kafka-bootstrap.brokers.svc.cluster.local:9092
CONFLUENT_BROKERS=kafka-cluster-kafka-bootstrap.brokers.svc.cluster.local:9092
NATS_BROKER_URL=nats://nats.brokers.svc.cluster.local:4222
RABBITMQ_URL=amqp://admin:BenchmarkAdmin2024@rabbitmq.brokers.svc.cluster.local:5672
```

I als logs:

```text
maxConcurrentRuns=3
```

## 4. Netejar execucions antigues

Fes-ho abans de repetir la demo per no barrejar runs antics:

```powershell
kubectl get ns -o name |
  Where-Object { $_ -like "namespace/sc-*" } |
  ForEach-Object { kubectl delete $_ --wait=false --ignore-not-found=true }
```

## 5. Verificar des del portal

1. Obre el portal Backstage.
2. Ves a `Escenaris`.
3. Llança els 16 escenaris si vols provar la cua.
4. Ves a `Resultats`.
5. Comprova que la fila principal mostra nomes els runs en curs.
6. Comprova que els runs pendents surten com a indicador compacte de cua.
7. Ves a `Execucions` i filtra per `Pendent`, `En curs`, `Completat`, `Aturat`
   i `Fallit`.

Els cinc presets que han de quedar visibles a `Escenaris` són:

| Cas final | Preset |
|---|---|
| IoT | `NATS telemetria IoT` |
| Vídeo 4K | `Kafka streaming 4K` |
| Financer | `RabbitMQ financer fiable` |
| Confluent | `Confluent streaming 4K` |
| Kafka | `Kafka control base` |

El format `Vídeo 8K` continua disponible al formulari, però no és el preset
principal perquè força payloads de 2 MB. Per Kafka i Confluent, abans de donar
un resultat 8K per bo, comprova que el manifest de Kafka tingui
`message.max.bytes`, `replica.fetch.max.bytes` i `socket.request.max.bytes`
per sobre del payload.

## 6. Mode estricte per a memoria

Per prendre dades finals mes defensables:

```powershell
kubectl set env deployment/benchmark-orchestrator -n $NS_APP MAX_CONCURRENT_RUNS=1
kubectl rollout status deployment/benchmark-orchestrator -n $NS_APP --timeout=180s
```

Per tornar a la demo rapida:

```powershell
kubectl set env deployment/benchmark-orchestrator -n $NS_APP MAX_CONCURRENT_RUNS=3
kubectl rollout status deployment/benchmark-orchestrator -n $NS_APP --timeout=180s
```
