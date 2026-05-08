# Troubleshooting — Errors coneguts i solucions

Aquest document recull els errors **coneguts** del projecte i la seva
solució. Cada entrada inclou: símptoma, causa i fix aplicat o passos
per resoldre-ho.

Documents relacionats:

- [`INSTAL-CLUSTER.md`](INSTAL-CLUSTER.md) — Guia d'instal·lació al cluster
- [`../README.md`](../README.md) — Arquitectura general del projecte

> Si trobes un cas nou, afegeix-lo al final amb data i diagnòstic.

---

## Contingut

1. [Build i compilació](#1-build-i-compilació)
2. [Runtime — portal i microserveis](#2-runtime--portal-i-microserveis)
3. [Brokers de missatgeria](#3-brokers-de-missatgeria)
4. [Observabilitat (Grafana / Elasticsearch)](#4-observabilitat-grafana--elasticsearch)
5. [Catàleg de components](#5-catàleg-de-components)
6. [Checklist ràpid](#6-checklist-ràpid-quan-res-no-funciona)

---

## 1. Build i compilació

### `yarn tsc` falla amb `is declared but its value is never read`

**Símptoma**: error TypeScript `TS6133` per variables no usades.

```
plugins/async-benchmark/src/pages/CatalogPage.tsx:481:9 - error TS6133:
'activeFilterLabel' is declared but its value is never read.
```

**Causa**: `noUnusedLocals` / `noUnusedParameters` activat al `tsconfig.json`.

**Solució**: elimina la variable o prefixa-la amb `_` si la necessites per debug:

```ts
// Incorrecte
const activeFilterLabel = computeLabel();

// Correcte (suprimeix l'error)
const _activeFilterLabel = computeLabel();
```

---

### `yarn build:all` triga molt o falla per memòria

**Causa**: Node.js agota el heap amb molts paquets compilant en paral·lel.

**Solució**:

```bash
# Augmenta el heap de Node per compilar en local
NODE_OPTIONS="--max-old-space-size=4096" yarn build:all

# O delega el build a Azure Container Registry (cap cost de CPU local)
az acr build --registry "$ACR_NAME" --image <servei>:latest \
  --file packages/<servei>/Dockerfile packages/<servei>
```

---

### Imatge Docker amb errors de `COPY`

**Símptoma**: el `docker build` falla amb `COPY failed: file not found`.

**Causa**: el Dockerfile del backend Backstage espera el **repositori arrel**
com a build context, no la carpeta `packages/backend/`.

```bash
# ✅ CORRECTE — des de l'arrel del repositori
docker build -f packages/backend/Dockerfile -t backstage .

# ❌ INCORRECTE
cd packages/backend && docker build -t backstage .
```

**Referència**: commits `4cead17` i `ff6b840`.

---

### `ImagePullBackOff` al cluster

**Símptoma**: el pod no pot baixar la imatge de l'ACR.

**Diagnòstic**:

```bash
kubectl describe pod <nom-del-pod> | grep -A 5 "Events:"
```

**Solució**:

```bash
# Comprova que l'AKS està lligat a l'ACR
az aks check-acr -n $AKS_NAME -g $AZ_RG --acr $ACR

# Si no ho està, refés l'attachment
az aks update -n $AKS_NAME -g $AZ_RG --attach-acr $ACR_NAME
```

---

## 2. Runtime — portal i microserveis

### Resultats buits o gràfics que no canvien en filtrar

**Símptoma**: aplico un filtre (p.ex. "vídeo 4K") i la taula canvia,
però els gràfics de latència i throughput es queden parats.

**Causa**: el component `HBarChart` usa una transició CSS de 500 ms i
React no detecta canvis "estructurals" prou clars quan l'estat dels
filtres canvia sense canviar la mida de la llista.

**Fix aplicat**: cada gràfic té una `key` derivada de l'estat dels filtres.
React desmunta i remunta el component a l'instant. Si torna a passar,
comprova que `claveGrafiques` inclou tots els filtres rellevants:

```ts
const claveGrafiques =
  `${filterPlatform.join(',')}|${filterProtocol.join(',')}|...|${scenarioHistory.length}`;
```

---

### Mode indefinit que s'atura inesperadament

**Símptoma**: trio "Mode Indefinit" i el run s'atura al cap de 30 min
o finalitza amb una durada fixa inesperada.

**Causa històrica**: el frontend enviava `duration=3600` com a sentinel
i el backend tractava qualsevol valor ≥ 3600 com a indefinit, generant
confusió sobre la durada real.

**Fix aplicat**: el sentinel d'indefinit és ara únicament `duration=0`
(o `null`/`undefined`). Qualsevol nombre positiu és una durada finita real.

**Si tornes a veure runs que s'aturen**, sospita de:

1. **OOMKilled**: el pod del load-generator s'ha quedat sense memòria.
   Comprova `kubectl describe pod <pod>` i augmenta els límits a
   `DATA_FORMAT_CONFIG` (`packages/benchmark-orchestrator/src/index.ts`).
2. **backoffLimit**: si el contenidor falla 2 cops, el Job es marca `failed`
   (vegeu `monitorJob` a l'orchestrator).
3. **TTL del namespace**: si l'usuari ha clicat "Reinicia tot" o "Aturar",
   el namespace s'esborra i el run finalitza.

---

### Estadístiques contaminades entre execucions

**Símptoma**: torno a executar el mateix escenari i veig nombres del run anterior.

**Diagnòstic**: no és una contaminació real. Cada execució té un `runId`
únic generat per l'orchestrator. La pestanya **En directe** filtra per
`runId`. El que passa és que la pestanya **Historial** mostra l'**agregat
per escenari** (suma ponderada de tots els runs del mateix escenari);
és el comportament esperat.

**Solució**: si vols veure UN sol run, clica el detall del escenari i
veuràs la taula per execució individual.

---

### Mostres màximes a 10.000

**Causa**: la query a Elasticsearch tenia `size: 10000` hardcodat.
ES per defecte limita els resultats a 10.000 documents per query.

**Fix aplicat**:
1. La query ara fa scroll de 5.000 en 5.000 fins esgotar tots els resultats.
2. L'índex es crea amb `index.max_result_window=1.000.000`.

**Si tornes a veure el sostre**:

```bash
# Comprova la configuració actual de l'índex
kubectl exec deploy/elasticsearch -- \
  curl -s http://localhost:9200/async-metrics/_settings | grep max_result_window

# Si no és 1000000, aplica'l manualment
kubectl exec deploy/elasticsearch -- curl -X PUT \
  -H "Content-Type: application/json" \
  http://localhost:9200/async-metrics/_settings \
  -d '{"index":{"max_result_window":1000000}}'
```

---

### El Job del load-generator no arrenca

**Símptoma**: l'escenari queda en estat `pending` indefinidament.

**Diagnòstic**:

```bash
# Llista els últims jobs creats
kubectl get jobs -A | grep benchmark-

# Descriu el job per veure l'error
kubectl describe job <nom-del-job>

# Comprova que l'orchestrator ha pogut copiar el secret ACR al namespace efímer
kubectl get secrets -n sc-<slug>-<id>
```

**Causes habituals**: `ImagePullBackOff` (veure secció anterior) o
secret `acr-secret` no copiat al namespace efímer.

---

### Filtre d'execucions no mostra res

**Causa**: els runs antics poden tenir el camp `platform` buit si es van
crear amb una versió anterior del portal.

**Solució**:

- Aplica un filtre menys restrictiu (p.ex. filtra només per format).
- O esborra els runs antics amb el botó **"Reinicia tot"** a Execucions.

---

## 3. Brokers de missatgeria

### NATS rebutja missatges grans (`NATS_MAX_PAYLOAD_EXCEEDED`)

> Aquesta és la causa de gairebé tots els errors NATS + vídeo 8K.
> Segueix aquesta seqüència sense saltar passos.

**Quan passa**: format `video-8k` (~2 MB / 2.000.000 bytes) sobre NATS
Server amb configuració per defecte (`max_payload = 1.048.576` bytes = 1 MB).
El load-generator detecta que el `msgSize` excedeix el límit del servidor
i avorta amb `NATS_MAX_PAYLOAD_EXCEEDED` abans d'enviar cap missatge.

**Diagnòstic ràpid (< 1 minut)**:

```bash
# Obre un port-forward al servei de monitoratge de NATS
kubectl port-forward -n brokers svc/nats-headless 8222:8222 >/dev/null 2>&1 &
PF_PID=$!
sleep 2

# Consulta el límit actual
curl -s http://127.0.0.1:8222/varz | grep -E '"max_payload"'

kill $PF_PID 2>/dev/null
```

- `"max_payload": 1048576` (= 1 MB) → **és la causa de l'error** → aplica la solució.
- `"max_payload": 4194304` (= 4 MB) → el problema és un altre → llegeix el bloc «si encara falla» més avall.

**Solució A — NATS instal·lat amb Helm (recomanat)**:

```bash
# Registra el repo si no el tens
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update

# Aplica el nou límit i reinicia els pods
helm upgrade nats nats/nats -n brokers --reuse-values \
  --set-string config.merge.max_payload='<< 4MB >>'

# Confirma el reinici
kubectl rollout status statefulset/nats -n brokers
```

**Solució B — NATS instal·lat amb manifest manual**:

```bash
# 1) Aplica el ConfigMap del repositori
kubectl apply -f k8s/brokers/nats-config.yaml

# 2) Reinicia el workload
kubectl rollout restart statefulset/nats -n brokers
# o si el chart usa Deployment:
kubectl rollout restart deployment/nats -n brokers

# 3) Confirma
kubectl rollout status statefulset/nats -n brokers
```

**Solució C — No saps quin tipus de workload tens**:

```bash
kubectl -n brokers get all | grep -i nats
# Mostra si és statefulset.apps/nats o deployment.apps/nats
```

**Verifica que el fix s'ha aplicat**:

```bash
# Mètode 1: CLI nats (si disponible)
kubectl port-forward -n brokers svc/nats 4222:4222 &
nats server info   # ha de mostrar Max Payload: 4 MB

# Mètode 2: HTTP /varz (sempre disponible)
kubectl port-forward -n brokers svc/nats-headless 8222:8222 &
curl -s http://127.0.0.1:8222/varz | grep max_payload
# Esperat: "max_payload": 4194304
```

**Valida amb un escenari real**:

1. UI → Escenaris → "Nou escenari"
2. Plataforma: NATS Server, Protocol: NATS, Format: Vídeo 8K
3. Durada: 60 s
4. Executa i observa: `pending` → `running` → `completed` (no `failed`)

**Si encara falla amb 4 MB configurats**:

```bash
# Comprova que el pod s'ha reiniciat realment (AGE ha de ser minuts, no hores)
kubectl get pod -n brokers -l app.kubernetes.io/name=nats -o wide

# Revisa el preflight al codi font
# packages/load-generator/src/natsPreflight.ts
# Confirma quin valor pren de info.max_payload
```

---

### RabbitMQ no accepta connexions

**Símptoma**: l'orchestrator no pot connectar-se a RabbitMQ.

**Diagnòstic**:

```bash
kubectl logs deployment/benchmark-orchestrator | grep -i rabbit
kubectl exec -n brokers deploy/rabbitmq -- rabbitmqctl status
```

**Causes habituals**:

- Les credencials no coincideixen. L'orchestrator usa
  `amqp://admin:BenchmarkAdmin2024@rabbitmq.brokers.svc.cluster.local:5672`.
  Si vas canviar la contrasenya al chart de Helm, actualitza també la
  variable d'entorn `RABBITMQ_URL` al Job que crea l'orchestrator.
- El pod de RabbitMQ no ha acabat d'arrencar (pot trigar 30-60 s).

---

### Kafka topic ja existeix (Strimzi)

**Símptoma**: errors de tipus "topic already exists" als logs del load-generator.

**Causa**: Strimzi gestiona topics via el CRD `KafkaTopic`. Si el topic
ja existia d'una execució anterior, pot entrar en conflicte.

**Solució**:

```bash
# Esborra el topic i deixa que Strimzi el recreï
kubectl delete kafkatopic <nom-del-topic> -n kafka-strimzi

# Comprova que s'ha recreat
kubectl get kafkatopic -n kafka-strimzi
```

---

## 4. Observabilitat (Grafana / Elasticsearch)

### Grafana no veu Elasticsearch

**Símptoma**: els dashboards de Grafana mostren errors de "No data" o
"Data source connection failed".

**Diagnòstic**:

```bash
# Comprova el ConfigMap del datasource
kubectl get cm grafana-provisioning -o yaml | grep url

# L'URL ha de ser exactament:
# url: http://elasticsearch:9200

# Mira els logs de Grafana
kubectl logs deploy/grafana | grep -i datasource
```

**Solució**:

```bash
# Reinicia Grafana per recarregar el provisioning
kubectl rollout restart deployment/grafana
```

---

### Grafana perd dashboards a cada restart

**Causa**: la PVC `grafana-pvc` existia però no estava muntada al deployment.

**Fix aplicat**: el manifest actual ja té el `volumeMount` correcte.

**Verifica**:

```bash
kubectl get deploy grafana -o yaml | grep -A 3 volumeMounts
# Ha de mostrar: mountPath: /var/lib/grafana
```

**Si el problema persisteix**, comprova que la PVC té dades:

```bash
kubectl exec deploy/grafana -- ls /var/lib/grafana/
# Ha de mostrar fitxers de dashboards i plugins, no una carpeta buida
```

---

### Elasticsearch en `CrashLoopBackOff` per `vm.max_map_count`

**Símptoma**:

```
max virtual memory areas vm.max_map_count [65530] is too low,
increase to at least [262144]
```

**Causa**: Elasticsearch necessita que el kernel tingui `vm.max_map_count ≥ 262144`.
El manifest inclou un initContainer privilegiat que ho configura, però
alguns node pools d'AKS bloquegen contenidors `privileged: true`.

**Solució**:

1. Usa un node pool que permeti contenidors privilegiats.
2. O aplica la configuració al node host via un DaemonSet privileged:
   ```bash
   kubectl apply -f k8s/storage/vm-max-map-count-daemonset.yaml
   ```

---

## 5. Catàleg de components

### El catàleg apareix buit després de desplegar de zero

**Causa**: el `catalog-service` fa un seed automàtic la primera vegada que
arrenca contra un índex buit, però pot ser que no s'hagi executat.

**Solució** (força el reseed manualment):

```bash
kubectl exec deploy/catalog-service -- wget -qO- --post-data='' \
  http://localhost:3001/components/seed
```

Comprova que el catàleg té dades:

```bash
kubectl exec deploy/elasticsearch -- \
  curl -s http://localhost:9200/async-catalog/_count
# Ha de retornar "count" > 0
```

---

### Apache Pulsar apareix a la llista de plataformes

**Causa**: Pulsar es va eliminar del seed, però poden quedar documents
antics a l'índex d'Elasticsearch.

**Solució**:

```bash
kubectl exec deploy/elasticsearch -- curl -X POST \
  -H "Content-Type: application/json" \
  http://localhost:9200/async-catalog/_delete_by_query \
  -d '{"query":{"match":{"name":"Apache Pulsar"}}}'
```

---

## 6. Checklist ràpid quan res no funciona

Segueix aquest ordre abans d'investigar en profunditat:

```bash
# 1. Tots els pods estan Running?
kubectl get pods

# 2. Hi ha errors als logs?
kubectl logs deploy/<servei> --tail=50

# 3. Quins events recents hi ha al cluster?
kubectl get events --sort-by=.lastTimestamp | tail -20

# 4. El pod s'ha reiniciat moltes vegades?
kubectl describe pod <pod> | grep -E "Restart Count|Init Containers"

# 5. Reinicia un servei concret
kubectl rollout restart deploy/<servei>

# 6. Reinicia tots els microserveis (sense rebuild)
./deploy-all.sh --restart-only
```

Si el problema persisteix, mira la secció específica d'aquest document
o obre un issue al repositori amb el output del pas 2 i 3.
