# `k8s/brokers/` - Brokers de missatgeria

Aquest directori conte els manifests dels brokers que el `load-generator`
pot utilitzar dins del namespace `brokers`.

## Manifests

| Manifest | Broker | Servei intern | Notes |
|---|---|---|---|
| `nats-config.yaml` | NATS | ConfigMap | `max_payload=4MB` per acceptar payloads grans. |
| `nats.yaml` | NATS | `nats`, `nats-headless` | Deployment minim usat pel benchmark. |
| `rabbitmq.yaml` | RabbitMQ | `rabbitmq` | AMQP `5672` i consola `15672`. |

Kafka es desplega des de `k8s/kafka/` perquè necessita l'operador Strimzi.

## Aplicacio

```bash
kubectl create namespace brokers --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f k8s/brokers/
kubectl rollout status deployment/rabbitmq -n brokers --timeout=180s
kubectl rollout status deployment/nats -n brokers --timeout=120s
kubectl get pods,svc,endpoints -n brokers
```

## Endpoints que espera el codi

| Broker logic | Endpoint |
|---|---|
| Kafka | `kafka-cluster-kafka-bootstrap.brokers.svc.cluster.local:9092` |
| Confluent | Mateix endpoint Kafka-compatible si no es configura `CONFLUENT_BROKERS`. |
| RabbitMQ / AMQP | `amqp://admin:<password>@rabbitmq.brokers.svc.cluster.local:5672` |
| NATS | `nats://nats-headless.brokers.svc.cluster.local:4222` |

## Credencials RabbitMQ

L'usuari per defecte del manifest es desa al Secret `rabbitmq-admin`.
Per veure'l al Cloud Shell:

```bash
kubectl get secret rabbitmq-admin -n brokers -o jsonpath="{.data.username}" | base64 -d
echo
kubectl get secret rabbitmq-admin -n brokers -o jsonpath="{.data.password}" | base64 -d
echo
```

Per obrir la consola:

```bash
kubectl port-forward -n brokers svc/rabbitmq 15672:15672
```

Despres obre `http://127.0.0.1:15672`.

## Validacio NATS

```bash
kubectl port-forward -n brokers svc/nats-headless 8222:8222
curl http://127.0.0.1:8222/varz
```

El camp `max_payload` ha de ser com a minim `4194304`.

## Nota de mesura

En Azure for Students tots els brokers comparteixen un node petit. Aixo serveix
per recuperar el flux funcional, pero les proves finals s'han de fer de manera
serial i indicant sempre quins brokers estaven actius i quins recursos tenien.
