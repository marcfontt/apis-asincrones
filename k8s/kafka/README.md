# Kafka via Strimzi — Documentació TFG APIs Asíncrones

## Per què Strimzi?

Després de provar 3 opcions (YAML pur, Helm, Strimzi):
- **YAML pur**: KO — imatges Docker Hub bloquejades a AKS
- **Helm Bitnami**: KO — imatges Docker Hub bloquejades + restricció imatges externes
- **Strimzi**: OK — usa quay.io, és el que recomana Microsoft per AKS

## Arquitectura desplegada
```
kafka-strimzi (namespace)
├── strimzi-cluster-operator    # Operador que gestiona tot
├── kafka-cluster-dual-role-0   # Broker + Controller (KRaft, sense Zookeeper)
└── kafka-cluster-entity-operator # Gestiona KafkaTopic i KafkaUser
```

## Instal·lació des de zero

### 1. Crear namespace i instal·lar operador
```bash
kubectl create namespace kafka-strimzi
kubectl create -f 'https://strimzi.io/install/latest?namespace=kafka-strimzi' -n kafka-strimzi
kubectl wait deployment/strimzi-cluster-operator -n kafka-strimzi \
  --for=condition=Available --timeout=120s
```

### 2. Desplegar el cluster Kafka
```bash
kubectl apply -f k8s/kafka/kafkanodepool.yaml
kubectl apply -f k8s/kafka/kafka-cluster.yaml
kubectl wait kafka/kafka-cluster -n kafka-strimzi \
  --for=condition=Ready --timeout=300s
```

### 3. Verificar
```bash
kubectl get pods -n kafka-strimzi
kubectl get kafka -n kafka-strimzi
# Expected: kafka-cluster Ready True, versió 4.1.1
```

## Bootstrap server (per producers/consumers)
```
kafka-cluster-kafka-bootstrap.kafka-strimzi.svc.cluster.local:9092
```

## Crear un tòpic dinàmicament
```yaml
apiVersion: kafka.strimzi.io/v1
kind: KafkaTopic
metadata:
  name: NOM-TOPIC
  namespace: kafka-strimzi
  labels:
    strimzi.io/cluster: kafka-cluster
spec:
  partitions: 1
  replicas: 1
```

## Compatibilitat plataforma/arquitectura/protocol

| Plataforma   | Arquitectures | Protocols         | Strimzi |
|--------------|---------------|-------------------|---------|
| Kafka        | EDA, EMA      | Kafka, AMQP       | Natiu   |
| Confluent    | EDA, EMA      | Kafka, AMQP       | Compatible |
| RabbitMQ     | QBA, EDA      | AMQP, MQTT        | No (pròximament) |
| NATS Server  | EDA, SEA, LCA | NATS, WebSockets  | No (pròximament) |

## Versions
- Strimzi Operator: 0.51.0
- Kafka: 4.1.1 (KRaft mode, sense Zookeeper)
- AKS: k8s 1.33.6
