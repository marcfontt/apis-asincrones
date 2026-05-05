# `k8s/brokers/` — ConfigMaps per a Message Brokers

Aquest directori conté configuracions personalitzades per a Message Brokers
(NATS, RabbitMQ, etc.) desplegats al cluster.

## Namespace
Les ConfigMaps es desplegen al namespace `apis-asincronas`.

## Manifests

| Manifest | Broker | Servei | Notas |
|----------|--------|--------|-------|
| `nats-config.yaml` | NATS Server | NATS | ConfigMap amb paràmetres de tuning |

## NATS Config (nats-config.yaml)

### Paràmetres principals

```yaml
max_payload: 4M      # Màxim tamany de missatge (2 MB per vídeos 8K)
max_connections: 1000
max_pending_size: 256M
```

### Per què 4 MB?

Els escenaris de vídeo 8K generen missatges de ~2 MB. Amb marge de seguretat,
`max_payload: 4M` evita rebutjaments.

### Aplicar configuració

```bash
# Crear/actualitzar ConfigMap
kubectl apply -f k8s/brokers/nats-config.yaml

# Verificar
kubectl get cm -n apis-asincronas
kubectl describe cm nats-config -n apis-asincronas
```

### Muntar a NATS Deployment

El Deployment de NATS (si existeix) munta aquesta ConfigMap:

```yaml
volumeMounts:
  - name: nats-config
    mountPath: /etc/nats
volumes:
  - name: nats-config
    configMap:
      name: nats-config
```

I inicia NATS amb: `nats-server -c /etc/nats/server.conf`

## Extensibilitat (Futur)

Si s'afegixen altres brokers (RabbitMQ, Redis):

```
brokers/
├── nats-config.yaml
├── rabbitmq-config.yaml      # (futur)
├── redis-config.yaml         # (futur)
└── README.md
```

Cada uno amb la seva ConfigMap personalitzada.

## Monitorar

```bash
# Veure ConfigMaps
kubectl get cm -n apis-asincronas

# Veure contingut de nats-config
kubectl get cm nats-config -n apis-asincronas -o yaml | grep -A 50 'data:'
```

## Notes

- Els ConfigMaps es creen sense Deployment/StatefulSet soci. Úsals
  des de tus Deployments (mounts de volum).
- Canvis a la ConfigMap NO recarreguen automàticament NATS.
  Cal restart manual: `kubectl rollout restart deployment/nats -n apis-asincronas`
