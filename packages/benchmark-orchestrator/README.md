# `benchmark-orchestrator`

Microservei que llanca proves reals sobre Kubernetes. Quan l'usuari clica
`Executar`, el portal envia una peticio a aquest servei i el servei crea un Job
amb el container `load-generator`.

## Que fa

- Rep `POST /runs` amb l'escenari i possibles canvis de durada, ratio o payload.
- Llegeix l'escenari des de `scenario-service`.
- Decideix quin broker tecnic s'ha d'usar: `kafka`, `confluent`, `nats` o `rabbitmq`.
- Comprova que el broker tingui un Service amb endpoints llestos al namespace `brokers`.
- Si el broker no esta preparat, marca el run com a `failed` i envia una mostra
  de diagnosi a `metrics-api` amb `errorCode=BROKER_NOT_READY`.
- Crea un namespace efimer per a la prova.
- Copia el Secret d'ACR al namespace nou.
- Crea el Job de Kubernetes amb les variables d'entorn necessaries.
- Revisa l'estat del Job cada pocs segons.
- Si l'usuari atura el run, deixa una finestra curta perque el generador enviï
  l'ultima mostra.

## API

| Metode | Ruta | Descripcio |
|---|---|---|
| GET | `/health` | Healthcheck i estat de Kubernetes. |
| GET | `/runs` | Llista runs en memoria, ordenats de mes nou a mes antic. |
| GET | `/runs/active` | Llista runs pendents o en curs. |
| GET | `/runs/:id` | Detall d'un run. |
| POST | `/runs` | Llanca un run nou. |
| POST | `/runs/:id/cancel` | Atura un run en curs. |
| POST | `/runs/reset` | Esborra tots els runs i les metriques. |
| DELETE | `/runs/:id` | Elimina un run i les seves metriques. |

## Endpoints de broker

| Broker logic | Service comprovat | Endpoint passat al Job |
|---|---|---|
| `kafka` | `kafka-cluster-kafka-bootstrap` | `KAFKA_BROKERS` |
| `confluent` | `kafka-cluster-kafka-bootstrap` | `CONFLUENT_BROKERS`, per defecte igual que Kafka |
| `nats` | `nats` o `nats-headless` | `NATS_BROKER_URL` |
| `rabbitmq` / `amqp` / `mqtt` | `rabbitmq` | `RABBITMQ_URL` |

## Entorn

| Variable | Valor habitual |
|---|---|
| `PORT` | `3003` en Kubernetes. |
| `SCENARIO_SERVICE_URL` | `http://scenario-service:3002` |
| `METRICS_API_URL` | `http://metrics-api:3004` |
| `ACR_SERVER` | `asyncpfg65454.azurecr.io` |
| `NAMESPACE` | `apis-asincrones` |
| `BROKER_NAMESPACE` | `brokers` |
| `LOAD_GENERATOR_CPU` | `100m` en Azure for Students |
| `MAX_CONCURRENT_RUNS` | `3` per a la demo final; posa `1` si vols una mesura estrictament serial |
| `LOAD_GENERATOR_NODE_SELECTOR_KEY` | `benchmark-role`, si es vol fixar el node dels Jobs |
| `LOAD_GENERATOR_NODE_SELECTOR_VALUE` | `loadgen`, si es vol fixar el node dels Jobs |
| `KAFKA_BROKERS` | `kafka-cluster-kafka-bootstrap.brokers.svc.cluster.local:9092` |
| `CONFLUENT_BROKERS` | Per defecte igual que `KAFKA_BROKERS` |
| `NATS_BROKER_URL` | `nats://nats.brokers.svc.cluster.local:4222` |
| `RABBITMQ_URL` | `amqp://admin:<password>@rabbitmq.brokers.svc.cluster.local:5672` |

En local, defineix `PORT=3003` si vols provar-lo darrere del mateix proxy que
usa Backstage.

En el clúster Azure Students, fixar els Jobs de carrega a un node etiquetat
evita que el generador caigui de manera diferent segons el broker mesurat. Aixo
millora la comparabilitat dels resultats.

Important: els noms dels nodes AKS no són estables. Si el node pool es recrea,
el label pot desaparèixer encara que el manifest continuï demanant
`benchmark-role=loadgen`. Abans d'executar una tanda, comprova:

```powershell
kubectl get nodes -L benchmark-role
```

Si no hi ha cap node amb `loadgen`, etiqueta un node actual:

```powershell
$LOAD_NODE = (kubectl get nodes --no-headers | Select-Object -First 1).ToString().Trim().Split()[0]
kubectl label node $LOAD_NODE benchmark-role=loadgen --overwrite
```

Si falta aquest label, els Jobs queden `Pending` amb motiu `Unschedulable` i no
apareixen mostres a Resultats en directe.

El backend limita quants Jobs entren a Kubernetes amb `MAX_CONCURRENT_RUNS`.
En el cluster final s'ha deixat a `3` per poder executar els 16 escenaris sense
omplir el node de pods `Pending`. Els runs sobrants queden en estat `pending`
dins de l'orquestrador i no creen Job fins que hi ha espai.

Per a taules finals de benchmarking, baixa temporalment el valor a `1`. Amb
`3` s'aconsegueix una demo molt mes rapida, pero els tres generadors comparteixen
el node `benchmark-role=loadgen` i poden introduir soroll en latencia i
throughput.

## Permisos

Necessita permisos per crear namespaces, Jobs i Secrets i per llegir Services i
Endpoints dels brokers. La configuracio esta a
`k8s/rbac/benchmark-orchestrator-rbac.yaml`.
