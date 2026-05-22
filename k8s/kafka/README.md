# Kafka via Strimzi — Documentació TFG APIs Asíncrones

## Per què Strimzi?

Després de provar 3 opcions (YAML pur, Helm, Strimzi):
- **YAML pur**: KO — imatges Docker Hub bloquejades a AKS
- **Helm Bitnami**: KO — imatges Docker Hub bloquejades + restricció imatges externes
- **Strimzi**: OK — usa quay.io, és el que recomana Microsoft per AKS

## Arquitectura desplegada
```
brokers (namespace)
├── strimzi-cluster-operator      # Operador que gestiona Kafka
├── kafka-cluster-dual-role-0     # Broker + Controller (KRaft, sense Zookeeper)
└── kafka-cluster-entity-operator # Gestiona KafkaTopic i KafkaUser
```

Kafka viu al namespace `brokers` juntament amb la resta de brokers. Aquest
canvi redueix passos operatius en el nou AKS d'Azure for Students. Per a la
mesura, el que importa és mantenir recursos, durada, warm-up, payload i rate
constants, i no executar dos benchmarks alhora.

## Instal·lació des de zero

### 1. Crear namespace i instal·lar operador
```bash
kubectl create namespace brokers --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f 'https://strimzi.io/install/latest?namespace=brokers' -n brokers
kubectl wait deployment/strimzi-cluster-operator -n brokers \
  --for=condition=Available --timeout=120s
```

### 2. Desplegar el cluster Kafka
```bash
kubectl apply -f k8s/kafka/kafkanodepool.yaml
kubectl apply -f k8s/kafka/kafka-cluster.yaml
kubectl wait kafka/kafka-cluster -n brokers \
  --for=condition=Ready --timeout=300s
```

### 3. Verificar
```bash
kubectl get pods -n brokers
kubectl get kafka -n brokers
# Expected: kafka-cluster Ready True, versió 4.1.1
```

## Bootstrap server (per producers/consumers)
```
kafka-cluster-kafka-bootstrap.brokers.svc.cluster.local:9092
```

## Crear un tòpic dinàmicament
```yaml
apiVersion: kafka.strimzi.io/v1
kind: KafkaTopic
metadata:
  name: NOM-TOPIC
  namespace: brokers
  labels:
    strimzi.io/cluster: kafka-cluster
spec:
  partitions: 1
  replicas: 1
```

## Compatibilitat plataforma/arquitectura/protocol

| Plataforma | Arquitectures | Protocols | Estat actual |
|------------|---------------|-----------|--------------|
| Kafka | EDA, LCA, SEA | Kafka | Natiu amb Strimzi |
| Confluent | EDA, LCA, SEA | Kafka | Camí Kafka-compatible al namespace `brokers` |
| RabbitMQ | QBA, EDA | AMQP | Servei separat al namespace `brokers` |
| NATS Server | EDA, SEA | NATS | Servei separat al namespace `brokers` |

## Versions
- Strimzi Operator: 0.51.0
- Kafka: 4.1.1 (KRaft mode, sense Zookeeper)
- AKS: k8s 1.34.7 al nou cluster d'Azure for Students
