# `k8s/kafka/` - Kafka amb Strimzi

Kafka es desplega amb Strimzi al namespace `brokers`. El clúster és d'un sol node en mode KRaft perquè el pressupost d'Azure for Students és limitat.

## Per què Strimzi

Es va triar Strimzi perquè permet gestionar Kafka amb recursos Kubernetes propis i evita dependències de charts que, en l'entorn d'AKS utilitzat, havien donat problemes d'imatges o de permisos. A més, deixa explícites la versió de Kafka, els recursos i la configuració de payload.

## Recursos

| Manifest | Recurs |
|---|---|
| `kafka-cluster.yaml` | Recurs `Kafka` amb versió `4.1.1`. |
| `kafkanodepool.yaml` | Recurs `KafkaNodePool` amb un broker/controlador. |

## Configuració principal

- Kafka `4.1.1`.
- Mode KRaft, sense ZooKeeper.
- 1 replica.
- Storage efímer.
- Recursos del broker: `300m` CPU i `768Mi` memòria.
- `message.max.bytes` i `replica.fetch.max.bytes` ajustats per acceptar payloads grans.

## Instal·lació

```bash
kubectl create namespace brokers --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f 'https://strimzi.io/install/latest?namespace=brokers' -n brokers
kubectl wait deployment/strimzi-cluster-operator -n brokers --for=condition=Available --timeout=300s
kubectl apply -f k8s/kafka/
kubectl wait kafka/kafka-cluster -n brokers --for=condition=Ready --timeout=300s
```

## Bootstrap server

```text
kafka-cluster-kafka-bootstrap.brokers.svc.cluster.local:9092
```

Aquest endpoint també s'utilitza com a camí Kafka-compatible per als escenaris marcats com a Confluent, si no es configura un endpoint Confluent propi.

## Validació

```bash
kubectl get pods -n brokers
kubectl get kafka,kafkanodepool -n brokers
kubectl get endpoints kafka-cluster-kafka-bootstrap -n brokers
```

## Compatibilitat al portal

| Plataforma declarada | Arquitectura habitual | Protocol | Execució actual |
|---|---|---|---|
| Apache Kafka | LCA | Kafka | Kafka Strimzi. |
| Confluent | LCA | Kafka | Mateix camí Kafka-compatible. |

La memòria ha de deixar clar que Confluent no inclou serveis extra en aquesta fase.
