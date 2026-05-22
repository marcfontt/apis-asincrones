# `load-generator`

Container que genera carrega contra el broker triat. No es un servei web:
`benchmark-orchestrator` l'arrenca com a Job de Kubernetes per a cada execucio.

## Flux

1. Llegeix variables d'entorn com `RUN_ID`, `BROKER_TYPE`,
   `MESSAGES_PER_SECOND`, `MESSAGE_SIZE_BYTES` i `TEST_DURATION_SECONDS`.
2. Envia una mostra inicial `event=load-generator-started` a `metrics-api`.
3. Connecta amb el broker corresponent.
4. Crea el topic, queue o subject efimer.
5. Envia missatges a la velocitat configurada.
6. Llegeix missatges al consumidor i calcula latencia.
7. Envia snapshots a `metrics-api` cada 5 segons.
8. En acabar, o quan rep una aturada, intenta enviar una mostra final.

La mostra inicial evita que la UI quedi completament en blanc si el Job arrenca
pero falla abans de connectar amb el broker.

## Contracte de comparacio

Per comparar runs, el generador intenta mantenir les mateixes condicions:

- mateix payload si `MESSAGE_SIZE_BYTES` i `DATA_FORMAT` son iguals;
- mateixa velocitat objectiu;
- mateix criteri de latencia;
- una mostra inicial de diagnosi;
- snapshots acumulats cada 5 segons;
- dades parcials si el run s'atura abans d'acabar.

El warm-up tecnic es controla amb `WARMUP_SECONDS`. Si no es passa cap valor,
el defecte del generador es de 5 segons. La UI pot recomanar escenaris amb
warm-up mes llarg, pero per aplicar-lo al Job cal passar aquesta variable des
de l'orquestrador.

## Variables d'entorn

| Variable | Que indica |
|---|---|
| `RUN_ID` | Identificador unic del run. |
| `SCENARIO_ID` | Escenari que s'esta executant. |
| `BROKER_TYPE` | `kafka`, `confluent`, `nats` o `rabbitmq`. |
| `ARCHITECTURE` | Arquitectura declarada a l'escenari. |
| `PROTOCOL` | Protocol declarat a l'escenari. |
| `PLATFORM` | Plataforma declarada a l'escenari. |
| `DATA_FORMAT` | Format de dades de la prova. |
| `KAFKA_BROKERS` | Bootstrap servers de Kafka o endpoint Kafka-compatible. |
| `NATS_URL` | URL de NATS. |
| `RABBITMQ_URL` | URL d'AMQP. |
| `METRICS_API_URL` | Endpoint on es pugen les mostres. |
| `TEST_DURATION_SECONDS` | `0` vol dir execucio indefinida. |
| `MESSAGES_PER_SECOND` | Velocitat objectiu. |
| `MESSAGE_SIZE_BYTES` | Mida del payload. |
| `WARMUP_SECONDS` | Segons inicials que no pesen en la mesura. |

## Errors coneguts

NATS rebutja missatges grans si `max_payload` no esta configurat. Per proves de
video 8K sobre NATS cal aplicar `k8s/brokers/nats-config.yaml` i reiniciar NATS
abans d'executar.

Si `metrics-api` retorna error o timeout en un `POST /metrics`, el generador ho
registra als logs del Job. Aixo es clau per diagnosticar runs que abans quedaven
amb `0 mesures` sense cap pista visible.
