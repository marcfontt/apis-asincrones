# `k8s/brokers/` - NATS i RabbitMQ

Aquest directori conté els manifests dels brokers que no depenen de Strimzi. Kafka es documenta a `k8s/kafka/`.

## Manifests

| Manifest | Recurs | Notes |
|---|---|---|
| `nats-config.yaml` | ConfigMap | Configura NATS, inclòs `max_payload` per payloads grans. |
| `nats.yaml` | Deployment i Services | Exposa `nats` i `nats-headless`. |
| `rabbitmq.yaml` | Secret, Deployment i Service | Exposa AMQP `5672` i consola `15672`. |

## Recursos comparables

Els brokers de prova s'han alineat amb el mateix pressupost base:

| Broker | CPU | Memòria | QoS |
|---|---:|---:|---|
| Kafka | `300m` | `768Mi` | Guaranteed |
| RabbitMQ | `300m` | `768Mi` | Guaranteed |
| NATS | `300m` | `768Mi` | Guaranteed |

Això no vol dir que tots consumeixin igual. Vol dir que tots tenen el mateix sostre i que la comparació és més defensable.

## Aplicació

```bash
kubectl create namespace brokers --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f k8s/brokers/
kubectl rollout status deployment/rabbitmq -n brokers --timeout=180s
kubectl rollout status deployment/nats -n brokers --timeout=180s
kubectl get pods,svc,endpoints -n brokers
```

## Endpoints esperats

| Broker | Endpoint intern |
|---|---|
| RabbitMQ | `amqp://admin:<password>@rabbitmq.brokers.svc.cluster.local:5672` |
| NATS | `nats://nats.brokers.svc.cluster.local:4222` |

## Credencials RabbitMQ

```bash
kubectl get secret rabbitmq-admin -n brokers -o jsonpath="{.data.username}" | base64 -d
echo
kubectl get secret rabbitmq-admin -n brokers -o jsonpath="{.data.password}" | base64 -d
echo
```

Consola RabbitMQ:

```bash
kubectl port-forward -n brokers svc/rabbitmq 15672:15672
```

Després obre `http://127.0.0.1:15672`.

## Validació NATS

```bash
kubectl port-forward -n brokers svc/nats-headless 8222:8222
curl http://127.0.0.1:8222/varz
```

Per vídeo 8K, comprova que `max_payload` sigui prou alt abans de considerar vàlida la prova.
