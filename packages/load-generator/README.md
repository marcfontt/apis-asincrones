# `load-generator`

Container que genera càrrega contra el broker triat. No és un servei web: el `benchmark-orchestrator` l'executa com a Job de Kubernetes per a cada run.

## Flux

1. Llegeix variables d'entorn com `RUN_ID`, `BROKER_TYPE`, `MESSAGES_PER_SECOND`, `MESSAGE_SIZE_BYTES` i `TEST_DURATION_SECONDS`.
2. Envia una mostra inicial a `metrics-api` amb `event=load-generator-started`.
3. Connecta amb Kafka, Confluent, NATS o RabbitMQ.
4. Crea el topic, subject o queue efímer del run.
5. Publica missatges al ritme configurat.
6. Consumeix els missatges i calcula latència.
7. Envia snapshots a `metrics-api` cada 5 segons.
8. En acabar, intenta enviar una mostra final amb estat terminal.

La mostra inicial evita que la UI quedi completament en blanc si el Job arrenca però falla abans de publicar dades reals.

## Contracte de comparació

Perquè els runs siguin comparables, cal mantenir constants:

- format de dades;
- mida del payload;
- ritme d'enviament;
- durada;
- warm-up;
- broker i protocol declarats;
- recursos assignats al generador;
- concurrència global de l'orquestrador.

## Variables d'entorn

| Variable | Significat |
|---|---|
| `RUN_ID` | Identificador del run. |
| `SCENARIO_ID` | Escenari executat. |
| `BROKER_TYPE` | `kafka`, `confluent`, `nats` o `rabbitmq`. |
| `ARCHITECTURE` | Arquitectura declarada. |
| `PROTOCOL` | Protocol declarat. |
| `PLATFORM` | Plataforma declarada. |
| `DATA_FORMAT` | Format de dades. |
| `KAFKA_BROKERS` | Bootstrap servers de Kafka. |
| `CONFLUENT_BROKERS` | Endpoint Kafka-compatible de Confluent. |
| `NATS_URL` | URL de NATS. |
| `RABBITMQ_URL` | URL d'AMQP. |
| `METRICS_API_URL` | Endpoint de pujada de mostres. |
| `TEST_DURATION_SECONDS` | Durada de la prova. |
| `MESSAGES_PER_SECOND` | Ritme objectiu. |
| `MESSAGE_SIZE_BYTES` | Mida del payload. |
| `WARMUP_SECONDS` | Segons inicials descartats de la lectura estable. |

## Errors habituals

- Si NATS rebutja payloads grans, comprova `max_payload` a `k8s/brokers/nats-config.yaml`.
- Si Kafka 8K mostra latències molt altes, revisa el ritme, el payload i la pressió del clúster abans de comparar.
- Si `metrics-api` falla en un `POST /metrics`, el Job ho deixa als logs.

## Validació

```powershell
kubectl logs -n <namespace-sc> job/<job-name> --tail=80
```

Els logs han de mostrar la configuració inicial, la connexió al broker i línies periòdiques de throughput, latència, P99 i errors.
