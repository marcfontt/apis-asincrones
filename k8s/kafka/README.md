# Kafka via Strimzi

## Instal·lació de l'operador (1 vegada)
kubectl create namespace kafka-strimzi
kubectl create -f 'https://strimzi.io/install/latest?namespace=kafka-strimzi' -n kafka-strimzi

## Desplegament del cluster
kubectl apply -f kafkanodepool.yaml
kubectl apply -f kafka-cluster.yaml

## Verificació
kubectl get kafka -n kafka-strimzi
kubectl get pods -n kafka-strimzi

## Bootstrap server per connectar producers/consumers
kafka-cluster-kafka-bootstrap.kafka-strimzi.svc.cluster.local:9092
