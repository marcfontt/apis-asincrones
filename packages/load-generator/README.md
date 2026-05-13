# `load-generator`

Container que genera càrrega contra el broker triat. No és un servei web:
`benchmark-orchestrator` l'arrenca com a Job de Kubernetes per a cada
execució.

## Flux

1. Llegeix variables d'entorn com `RUN_ID`, `BROKER_TYPE`,
   `MESSAGES_PER_SECOND`, `MESSAGE_SIZE_BYTES` i `TEST_DURATION_SECONDS`.
2. Connecta amb el broker corresponent.
3. Crea el topic, queue o subject efimer.
4. Envia missatges a la velocitat configurada.
5. Llegeix missatges al consumidor i calcula latència.
6. Envia snapshots a `metrics-api` cada 5 segons.
7. En acabar, o quan rep una aturada, intenta enviar una mostra final.

## Contracte de comparacio

Per comparar runs, el generador intenta mantenir les mateixes condicions:

- mateix payload si `MESSAGE_SIZE_BYTES` i `DATA_FORMAT` són iguals;
- mateixa velocitat objectiu;
- mateix criteri de latencia;
- snapshots acumulats cada 5 segons;
- dades parcials si el run s'atura abans d'acabar.

El warm-up tècnic es controla amb `WARMUP_SECONDS`. Si no es passa cap
valor, el defecte del generador és de 5 segons. La UI pot recomanar
escenaris amb warm-up més llarg, però per aplicar-lo al Job cal passar
aquesta variable des de l'orquestrador.

## Variables d'entorn

| Variable | Què indica |
|----------|------------|
| `RUN_ID` | Identificador únic del run. |
| `SCENARIO_ID` | Escenari que s'està executant. |
| `BROKER_TYPE` | `kafka`, `confluent`, `nats` o `rabbitmq`. El valor `confluent` usa el servei Redpanda/API Kafka-compatible actual. |
| `ARCHITECTURE` | Arquitectura declarada a l'escenari. |
| `PROTOCOL` | Protocol declarat a l'escenari. |
| `PLATFORM` | Plataforma declarada a l'escenari. |
| `DATA_FORMAT` | Format de dades de la prova. |
| `KAFKA_BROKERS` | Bootstrap servers de Kafka o d'un endpoint Kafka-compatible. |
| `NATS_URL` | URL de NATS. |
| `RABBITMQ_URL` | URL d'AMQP. |
| `METRICS_API_URL` | Endpoint on es pugen les mostres. |
| `TEST_DURATION_SECONDS` | `0` vol dir execució indefinida. |
| `MESSAGES_PER_SECOND` | Velocitat objectiu. |
| `MESSAGE_SIZE_BYTES` | Mida del payload. |
| `WARMUP_SECONDS` | Segons inicials que no haurien de pesar en la mesura. |

## Errors coneguts

NATS rebutja missatges grans si `max_payload` no està configurat. Per
proves de vídeo 8K sobre NATS cal aplicar `k8s/brokers/nats-config.yaml`
i reiniciar NATS abans d'executar.
