# Demo Kafka - APIs Asíncrones

## Connectar al cluster
az aks get-credentials --resource-group aks-tests --name apis-asincronas --overwrite-existing

## Guardar pod
export KAFKA_POD=$(kubectl get pod -n apis-asincronas -l app=kafka -o jsonpath='{.items[0].metadata.name}')

## Crear topic
kubectl exec -n apis-asincronas $KAFKA_POD -- kafka-topics --create --topic benchmark-test --bootstrap-server localhost:9092 --partitions 3 --replication-factor 1 --if-not-exists

## Produir missatges
for i in $(seq 1 20); do echo "{\"id\":$i,\"ts\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"payload\":\"msg-$i\"}" | kubectl exec -i -n apis-asincronas $KAFKA_POD -- kafka-console-producer --topic benchmark-test --bootstrap-server localhost:9092; done

## Consumir
kubectl exec -n apis-asincronas $KAFKA_POD -- kafka-console-consumer --topic benchmark-test --bootstrap-server localhost:9092 --from-beginning --timeout-ms 10000

## Performance test
kubectl exec -n apis-asincronas $KAFKA_POD -- kafka-producer-perf-test --topic benchmark-test --num-records 10000 --record-size 256 --throughput -1 --producer-props bootstrap.servers=localhost:9092
