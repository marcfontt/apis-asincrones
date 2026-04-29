# Troubleshooting — què està fallant ara mateix i com solucionar-ho

Aquest document recull els errors **coneguts** del projecte i la seva
solució. Si trobes un cas nou, afegeix-lo al final amb data + diagnòstic.

> Per a la **instal·lació al cluster** vegeu [`INSTAL-CLUSTER.md`](INSTAL-CLUSTER.md).
> Per a la **arquitectura general** vegeu [`../README.md`](../README.md).

---

## Build i compilació

### `yarn tsc` falla amb `is declared but its value is never read`

És l'error de TypeScript estricte (`noUnusedLocals` / `noUnusedParameters`)
quan deixem una variable orfe. Reproduit recentment a:

```
plugins/async-benchmark/src/pages/CatalogPage.tsx:481:9 - error TS6133:
'activeFilterLabel' is declared but its value is never read.
```

**Solució**: elimina la variable. Si la necessites per debug, prefixa-la
amb `_` (`const _activeFilterLabel = ...`).

### `yarn build:all` triga molt o falla per memòria

- En local pot caldre pujar el heap de Node:
  `NODE_OPTIONS="--max-old-space-size=4096" yarn build:all`.
- Al cluster, fes el build amb `az acr build` per delegar el càlcul.

### Imatge Docker amb errors de COPY

El Dockerfile del backend Backstage espera el repo arrel com a
build context, no la carpeta `packages/backend/`. Comprovat per
commits 4cead17 i ff6b840.

```bash
# CORRECTE (des de l'arrel)
docker build -f packages/backend/Dockerfile -t backstage .

# INCORRECTE
cd packages/backend && docker build -t backstage .
```

---

## Runtime — portal i microserveis

### Resultats buits o stats que no canvien al filtrar

**Símptoma**: aplico un filtre (per exemple "vídeo 4K") i la taula
canvia, però els gràfics de latència i throughput es queden parats.

**Causa**: el component HBarChart usa una transició CSS de 500ms i
React no detecta canvis "estructurals" prou clars.

**Fix aplicat**: cada gràfic té una `key` derivada de l'estat dels
filtres, així React desmunta i remunta el component a l'instant. Si
torna a passar, comprova que la `claveGrafiques` inclou tots els
filtres rellevants:

```ts
const claveGrafiques =
  `${filterPlatform.join(',')}|${filterProtocol.join(',')}|...|${scenarioHistory.length}`;
```

### Mode indefinit que s'atura inesperadament

**Símptoma**: trio "Mode Indefinit" i el run s'atura al cap de 30 min,
o dura 1000 min en lloc de córrer fins que jo l'aturi.

**Causa històrica**: el frontend enviava `duration=3600` com a sentinel
i el backend tractava qualsevol valor `>=3600` com a indefinit. El
resultat: la UI prometia "1h max", el backend feia "indefinit", i
l'usuari no entenia què passava.

**Fix aplicat**: el sentinel d'indefinit és ara únicament `duration=0`
(o `null`/`undefined`). Qualsevol nombre positiu és durada finita real.

Si tornes a veure runs que s'aturen al cap de 30 min, sospita de:

1. **OOMKilled**: el Pod del load-generator s'ha quedat sense memòria.
   Comprova `kubectl describe pod <pod>` i puja els límits a
   `DATA_FORMAT_CONFIG` (`packages/benchmark-orchestrator/src/index.ts`).
2. **backoffLimit**: si el contenidor falla 2 cops, el Job es marca
   `failed` (vegeu `monitorJob`).
3. **TTL del namespace**: si l'usuari ha clicat "Reinicia tot" o
   "Aturar", el namespace s'esborra.

### Estadístiques contaminades entre execucions

**Símptoma**: torno a executar el mateix escenari i veig nombres del
run anterior (latència ja calculada, mostres acumulades, etc.).

**Diagnòstic**:
- Cada execució té un `runId` únic generat per l'orchestrator.
- La pestanya "En directe" filtra per `runId`, així que no pot haver-hi
  contaminació real entre runs.
- El que passa és que la pestanya **Historial** mostra l'**agregat per
  escenari** (suma ponderada de tots els runs del mateix escenari).
  És el comportament esperat. Si vols veure UN sol run, clica el detall
  del scenari i veuràs la taula per execució individual.

### Mostres màximes a 10.000

**Causa històrica**: la query a Elasticsearch tenia `size: 10000`
hardcodat. ES per defecte limita els resultats a 10.000 docs.

**Fix aplicat**:
1. La query ara fa `scroll` de 5.000 en 5.000 fins esgotar.
2. L'índex es crea amb `index.max_result_window=1.000.000`.

Si tornes a veure el sostre, comprova:
- `kubectl exec deploy/elasticsearch -- curl -s http://localhost:9200/async-metrics/_settings`
- Hauria de tenir `max_result_window: 1000000`. Si no, executa:
  ```bash
  kubectl exec deploy/elasticsearch -- curl -X PUT \
    -H "Content-Type: application/json" \
    http://localhost:9200/async-metrics/_settings \
    -d '{"index":{"max_result_window":1000000}}'
  ```

---

## Brokers de missatgeria

### NATS rebutja missatges grans (`NATS_MAX_PAYLOAD_EXCEEDED`)

> Aquesta és la causa de gairebé tots els errors NATS + vídeo 8K que
> hem vist al portal. Si encara apareix, vol dir que el `max_payload`
> del NATS Server al cluster encara no s'ha pujat. Segueix aquesta
> seqüència sense saltar passos.

**Quan passa**: format `video-8k` (~2 MB / 2.000.000 bytes) sobre NATS
Server amb configuració per defecte (`max_payload = 1.048.576` bytes,
és a dir, 1 MB). El load-generator detecta abans de publicar que el
seu `msgSize` excedeix el límit anunciat pel servidor i avorta amb
`NATS_MAX_PAYLOAD_EXCEEDED`.

**Diagnòstic ràpid (1 minut)**:

```bash
# Mostra el límit actual del NATS Server tal com es presenta als clients.
# En el nostre clúster el servei `nats` només exposa 4222; el port 8222
# surt pel servei headless.
kubectl port-forward -n brokers svc/nats-headless 8222:8222 >/dev/null 2>&1 &
PF_PID=$!
sleep 2
curl -s http://127.0.0.1:8222/varz | grep -E '"max_payload"'
kill $PF_PID 2>/dev/null
```

- Si veus `"max_payload": 1048576` (= 1 MB) → és la causa de l'error.
- Si veus `"max_payload": 4194304` (= 4 MB) → el problema és un altre
  (mira el bloc "Si encara falla amb 4 MB" més avall).

**Solució (tria la que correspongui al teu mètode d'instal·lació)**:

#### A. Si NATS s'ha instal·lat amb Helm (recomanat)

```bash
# Si surt "repo nats not found", primer registra el repositori Helm oficial.
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update

# Aplica el nou límit i reinicia els pods
helm upgrade nats nats/nats -n brokers --reuse-values \
  --set-string config.merge.max_payload='<< 4MB >>'

# Confirma que els pods s'han reiniciat
kubectl rollout status statefulset/nats -n brokers
```

#### B. Si NATS s'ha instal·lat amb un manifest manual (Deployment o StatefulSet propi)

```bash
# 1) ConfigMap del repositori
kubectl apply -f k8s/brokers/nats-config.yaml

# 2) Reinicia el workload (escull la línia que correspongui)
kubectl rollout restart statefulset/nats -n brokers
kubectl rollout restart deployment/nats   -n brokers  # si el chart fa servir Deployment

# 3) Confirma
kubectl rollout status statefulset/nats -n brokers
```

#### C. Si no saps quin tipus de workload tens

```bash
kubectl -n brokers get all | grep -i nats
```

L'output et dirà si és `statefulset.apps/nats` o `deployment.apps/nats`,
i així pots fer `rollout restart` al recurs correcte.

**Verifica que el nou límit s'ha aplicat**:

```bash
# Mètode 1: amb la CLI nats (si la tens)
kubectl port-forward -n brokers svc/nats 4222:4222 &
nats server info  # ha de mostrar Max Payload: 4 MB

# Mètode 2: HTTP /varz (sempre disponible, no cal CLI extra)
kubectl port-forward -n brokers svc/nats-headless 8222:8222 &
curl -s http://127.0.0.1:8222/varz | grep max_payload
# Esperat: "max_payload": 4194304
```

**Llança un escenari de prova per validar el fix**:

1. UI → Escenaris → "Nou escenari"
2. Plataforma: NATS Server, Protocol: NATS, Format: Vídeo 8K
3. Durada: 60 s, deixa la resta per defecte
4. Executa i observa la pestanya **Execucions**: l'estat ha de
   passar de `pending` → `running` → `completed` (no `failed`).

**Si encara falla amb 4 MB**:

- Comprova que el pod s'ha reiniciat de veritat:
  `kubectl get pod -n brokers -l app.kubernetes.io/name=nats -o wide`
  (la columna `AGE` ha d'indicar segons o minuts, no hores).
- Si el pod no ha rebut la nova config, el ConfigMap potser està
  muntat en un volum stale: descriu el pod i comprova el `command`.
- Repassa el preflight del load-generator a
  `packages/load-generator/src/natsPreflight.ts`. Pots llegir-lo per
  confirmar quin valor agafa de `info.max_payload`.

A la UI de Escenaris, si tries NATS + vídeo 8K, ja surt un avís
taronja amb un enllaç a aquest mateix bloc. No el ignoris si no
estàs segur que el cluster ja té el límit pujat.

### RabbitMQ no accepta connexions

- Comprova credencials: l'orchestrator passa
  `amqp://admin:BenchmarkAdmin2024@rabbitmq.brokers.svc.cluster.local:5672`.
- Si vas canviar la contrasenya al chart de Helm, has d'actualitzar
  també l'env `RABBITMQ_URL` al Job que crea l'orchestrator.

### Kafka topic ja existeix (Strimzi)

Strimzi crea topics amb el `KafkaTopic` CRD. Si veus errors de tipus
"topic already exists", esborra el `KafkaTopic` i deixa que Strimzi el
recreï:

```bash
kubectl delete kafkatopic <nom> -n kafka-strimzi
```

---

## Observabilitat

### Grafana no veu Elasticsearch

- Comprova el datasource: `kubectl get cm grafana-provisioning -o yaml`.
- L'URL ha de ser `http://elasticsearch:9200` (Service ClusterIP, no
  DNS extern).
- Reinicia Grafana: `kubectl rollout restart deployment/grafana`.

### Grafana perd dashboards a cada restart

**Causa històrica**: la PVC `grafana-pvc` existia però no estava muntada
al deployment.

**Fix aplicat**: el manifest actual ja té el `volumeMount` correcte.
Verifica:

```bash
kubectl get deploy grafana -o yaml | grep -A 3 volumeMounts
# Ha de sortir mountPath: /var/lib/grafana
```

---

## Catàleg

### El catàleg apareix buit després de despeljgar de zero

El `catalog-service` fa un seed automàtic la primera vegada que
arrenca contra un índex buit. Si no ho ha fet:

```bash
kubectl exec deploy/catalog-service -- wget -qO- --post-data='' \
  http://localhost:3001/components/seed
```

Això força el reseed.

### Apareix Pulsar a la llista

Pulsar es va eliminar del seed. Si encara apareix, és que hi ha
documents antics a l'índex. Esborra'ls:

```bash
kubectl exec deploy/elasticsearch -- curl -X POST \
  -H "Content-Type: application/json" \
  http://localhost:9200/async-catalog/_delete_by_query \
  -d '{"query":{"match":{"name":"Apache Pulsar"}}}'
```

---

## Quan res no funciona — checklist ràpid

1. `kubectl get pods` — tots Running?
2. `kubectl logs deploy/<servei> --tail=50` — algun error?
3. `kubectl get events --sort-by=.lastTimestamp | tail -20` — events recents?
4. `kubectl describe pod <pod>` — Init/restart counts?
5. **Reinicia el servei**: `kubectl rollout restart deploy/<servei>`.
6. **Reinicia tot**: `./deploy-all.sh --restart-only`.
