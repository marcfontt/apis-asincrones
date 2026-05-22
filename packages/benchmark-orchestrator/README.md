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
| `nats` | `nats-headless` o `nats` | `NATS_BROKER_URL` |
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
| `KAFKA_BROKERS` | `kafka-cluster-kafka-bootstrap.brokers.svc.cluster.local:9092` |
| `CONFLUENT_BROKERS` | Per defecte igual que `KAFKA_BROKERS` |
| `NATS_BROKER_URL` | `nats://nats-headless.brokers.svc.cluster.local:4222` |
| `RABBITMQ_URL` | `amqp://admin:<password>@rabbitmq.brokers.svc.cluster.local:5672` |

En local, defineix `PORT=3003` si vols provar-lo darrere del mateix proxy que
usa Backstage.

## Permisos

Necessita permisos per crear namespaces, Jobs i Secrets i per llegir Services i
Endpoints dels brokers. La configuracio esta a
`k8s/rbac/benchmark-orchestrator-rbac.yaml`.
