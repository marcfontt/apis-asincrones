# load-generator

Container que **genera càrrega real** contra el broker triat (Kafka,
Confluent, NATS, RabbitMQ) sota un contracte just per fer comparatives
fiables.

> No és un servei web: és una imatge que `benchmark-orchestrator` arrenca
> com a Job de Kubernetes per cada execució. Quan acaba, el Pod desapareix.

## Què fa, pas a pas

1. Llegeix les variables d'entorn (`BROKER_TYPE`, `RUN_ID`,
   `MESSAGE_SIZE_BYTES`, `MESSAGES_PER_SECOND`, `TEST_DURATION_SECONDS`,
   ...).
2. Connecta amb el broker corresponent.
3. Crea el topic/queue/subject efímer per a aquest run.
4. Envia missatges a la velocitat configurada (`MESSAGES_PER_SECOND`).
5. Llegeix els missatges al consumidor mesurant la latència
   amb `performance.now()` (precisió sub-millisegon).
6. Cada 5 segons, calcula i envia un snapshot de mètriques a
   `metrics-api` via `POST /metrics`.
7. Quan acaba la durada (o rep `SIGTERM` per cancel·lació), envia el
   snapshot final amb `status: 'completed'` i finalitza.

## Contracte de comparació justa

Perquè dos runs puguin comparar-se, totes les implementacions:

- Fan **fire-and-forget**, sense ACKs del broker.
- No persisten missatges (broker en memòria, queues efímeres).
- Tenen un **warm-up de 5 segons** (les primeres mostres es descarten).
- Usen `performance.now()` per a la latència.
- Generen el mateix payload (mateix `MESSAGE_SIZE_BYTES`, contingut
  determinista segons `DATA_FORMAT`).

## Variables d'entorn

| Variable                  | Què                                       |
|---------------------------|-------------------------------------------|
| `RUN_ID`                  | Identificador únic del run                |
| `SCENARIO_ID`             | ID de l'escenari                          |
| `BROKER_TYPE`             | `kafka`, `confluent`, `nats`, `rabbitmq`  |
| `ARCHITECTURE`            | Per a la metadada del doc                 |
| `PROTOCOL` / `PLATFORM`   | Per a la metadada del doc                 |
| `DATA_FORMAT`             | `default`, `video-4k`, `video-8k`, `iot`, `financial` |
| `KAFKA_BROKERS`           | Bootstrap servers                         |
| `NATS_URL`                | URL de NATS                               |
| `RABBITMQ_URL`            | URL d'AMQP                                |
| `METRICS_API_URL`         | Endpoint per pujar mètriques              |
| `TEST_DURATION_SECONDS`   | `0` = indefinit, sinó segons              |
| `MESSAGES_PER_SECOND`     | Ratio de generació                        |
| `MESSAGE_SIZE_BYTES`      | Mida del payload                          |

## Errors coneguts

- **NATS_MAX_PAYLOAD_EXCEEDED**: NATS Server per defecte rebutja
  missatges de més d'1 MB. Si tries `video-8k` (~2 MB) sobre NATS,
  cal aplicar `k8s/brokers/nats-config.yaml` (puja el límit a 4 MB) i
  reiniciar el deployment de NATS abans d'executar.
