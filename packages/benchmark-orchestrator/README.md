# `benchmark-orchestrator`

Microservei que rep peticions d'execució i crea Jobs reals de Kubernetes amb el `load-generator`.

## Què fa

1. Rep `POST /runs`.
2. Llegeix l'escenari a `scenario-service`.
3. Decideix el broker tècnic: `kafka`, `confluent`, `nats` o `rabbitmq`.
4. Verifica que el broker tingui endpoint llest al namespace `brokers`.
5. Si no hi ha capacitat, deixa el run en estat `pending`.
6. Quan hi ha espai, crea un namespace efímer `sc-*`.
7. Copia el secret d'ACR si cal.
8. Crea el Job de Kubernetes.
9. Vigila l'estat del Job i actualitza el run.
10. En cancel·lació, dona una finestra curta al generador per enviar l'última mostra.

## Per què hi ha cua

El clúster final té tres nodes, però les proves de memòria s'han de fer amb `MAX_CONCURRENT_RUNS=1` per no barrejar execucions. La cua permet seleccionar molts escenaris de cop sense crear tots els Jobs alhora. Els runs pendents no consumeixen recursos de Kubernetes i no generen mètriques fins que entren realment a execució.

`MAX_CONCURRENT_RUNS=3` és útil per a demostració, no per a dades finals estrictes.

## API

| Mètode | Ruta | Descripció |
|---|---|---|
| GET | `/health` | Healthcheck, estat de Kubernetes i concurrència. |
| GET | `/runs` | Runs en memòria, de més nou a més antic. |
| GET | `/runs/active` | Runs pendents o en curs. |
| GET | `/runs/:id` | Detall d'un run. |
| POST | `/runs` | Llança un run o el posa a la cua. |
| POST | `/runs/:id/cancel` | Atura un run. |
| POST | `/runs/reset` | Neteja runs i mètriques. |
| DELETE | `/runs/:id` | Elimina un run i les seves mètriques. |

## Endpoints de broker

| Broker lògic | Service comprovat | Variable passada al Job |
|---|---|---|
| `kafka` | `kafka-cluster-kafka-bootstrap` | `KAFKA_BROKERS` |
| `confluent` | `kafka-cluster-kafka-bootstrap` | `CONFLUENT_BROKERS` |
| `nats` | `nats` o `nats-headless` | `NATS_BROKER_URL` |
| `rabbitmq` | `rabbitmq` | `RABBITMQ_URL` |

Confluent usa el mateix endpoint Kafka-compatible si no es configura un endpoint propi.

## Entorn

| Variable | Valor habitual |
|---|---|
| `PORT` | `3003` |
| `SCENARIO_SERVICE_URL` | `http://scenario-service:3002` |
| `METRICS_API_URL` | `http://metrics-api:3004` |
| `ACR_SERVER` | `asyncpfg65454.azurecr.io` |
| `NAMESPACE` | `apis-asincrones` |
| `BROKER_NAMESPACE` | `brokers` |
| `LOAD_GENERATOR_CPU` | `100m` |
| `MAX_CONCURRENT_RUNS` | `1` per mesures finals, `3` per demo |
| `LOAD_GENERATOR_NODE_SELECTOR_KEY` | `benchmark-role` |
| `LOAD_GENERATOR_NODE_SELECTOR_VALUE` | `loadgen` |
| `KAFKA_BROKERS` | `kafka-cluster-kafka-bootstrap.brokers.svc.cluster.local:9092` |
| `CONFLUENT_BROKERS` | Per defecte igual que Kafka |
| `NATS_BROKER_URL` | `nats://nats.brokers.svc.cluster.local:4222` |
| `RABBITMQ_URL` | `amqp://admin:<password>@rabbitmq.brokers.svc.cluster.local:5672` |

## Validació operativa

```powershell
kubectl logs -n apis-asincrones deployment/benchmark-orchestrator --tail=40
kubectl get nodes -L benchmark-role
kubectl get pods -A -o wide | Select-String "benchmark-"
```

Si un Job queda `Pending` amb `Unschedulable`, revisa primer el label `benchmark-role=loadgen` als nodes.

## Permisos

Els permisos estan a `k8s/rbac/benchmark-orchestrator-rbac.yaml`. L'orquestrador necessita crear namespaces, Jobs i Secrets, i llegir Services, Endpoints, Pods i logs.
