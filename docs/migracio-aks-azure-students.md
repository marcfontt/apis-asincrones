# Migracio del cluster AKS a Azure for Students

Aquest document recull el pla operatiu per reconstruir el desplegament del PFG
quan el cluster AKS original de NTT Data queda en una subscripcio deshabilitada
o marcada com a nomes lectura.

## Context de la incidencia

El desplegament inicial del projecte estava allotjat en una subscripcio d'Azure
de NTT Data. El 13/05/2026 va finalitzar el periode de practiques i el 18/05/2026
es va demanar de nou l'acces coincidint amb el canvi de contracte. El 22/05/2026
es va confirmar que la subscripcio associada al cluster AKS havia estat donada
de baixa o quedava en estat de nomes lectura. La consequencia practica es que
el cluster antic no es pot considerar recuperable per a operacions d'escriptura:
no es poden iniciar serveis de Kubernetes, modificar node pools ni desplegar
recursos nous de manera fiable.

La decisio tecnica es reconstruir la plataforma sobre una subscripcio personal
Azure for Students, mantenint el mateix codi, els mateixos manifests Kubernetes
i el mateix flux experimental. Aquesta decisio canvia l'entorn d'execucio, pero
no canvia l'objectiu del projecte: desplegar escenaris comparables de brokers i
protocols asincrons i mesurar-ne el comportament.

## Viabilitat de l'opcio Azure for Students

Azure for Students dona un credit de 100 USD durant 12 mesos. AKS te el pla de
gestio de cluster en nivell Free, pero els nodes continuen consumint credit.
Per tant, l'opcio es viable per a una reconstruccio controlada, demostracions i
proves acotades, sempre que el cluster s'aturi quan no s'usa i que el dimensionat
sigui inferior al cluster empresarial original.

Restriccions practiques:

- No s'ha de mantenir el cluster ences permanentment fins a l'entrega.
- No s'han de comparar directament resultats del cluster NTT amb resultats del
  cluster d'estudiant si canvia la mida de node o la configuracio.
- Les proves defensables han d'indicar la mida exacta del node, versio de
  Kubernetes, nombre de nodes, limits i requests dels pods, durada, warm-up i
  repeticions.
- Per benchmarking, nomes ha d'executar-se un escenari de mesura alhora.

Fonts oficials consultades:

- Azure for Students: https://azure.microsoft.com/es-es/free/students
- Condicions Azure for Students: https://azure.microsoft.com/es-es/pricing/offers/ms-azr-0170p/
- AKS Free tier: https://learn.microsoft.com/azure/aks/free-standard-pricing-tiers
- AKS stop/start: https://learn.microsoft.com/azure/aks/start-stop-cluster

## Estrategia de migracio

La migracio no ha de ser un intent de reparar el cluster antic. El flux correcte
es:

1. Inventariar tot el que encara es pugui llegir del cluster antic.
2. Crear una subscripcio i un grup de recursos nous.
3. Crear un ACR nou o reutilitzar-ne un accessible.
4. Crear un AKS nou en nivell Free, amb una node pool petita pero suficient.
5. Publicar de nou les imatges Docker al nou ACR.
6. Aplicar els manifests del repositori.
7. Instal.lar Strimzi i desplegar Kafka.
8. Validar el portal, els serveis, els brokers i una execucio end-to-end.
9. Documentar la desviacio a la memoria.

## Fase 0: inventari del cluster antic

Fer-ho des d'Azure Cloud Shell. Si la subscripcio antiga no permet accedir a
l'API de Kubernetes, guardar com a evidencia la captura del portal i continuar
amb els manifests del repositori.

El 22/05/2026 es va provar l'acces amb Azure CLI contra la subscripcio antiga:

```bash
az account set --subscription 30d4219f-fcd6-4b7f-b448-6e6440bbacea
az aks get-credentials \
  --resource-group aks-tests \
  --name apis-asincronas \
  --overwrite-existing
```

El resultat va ser:

```text
(ReadOnlyDisabledSubscription) The subscription '30d4219f-fcd6-4b7f-b448-6e6440bbacea' is disabled and therefore marked as read only.
```

Aixo confirma que el cluster antic no es pot operar ni inventariar via
`kubectl` si abans no es reactiva la subscripcio. Per tant, la reconstruccio
passa a ser el cami principal.

```bash
az account list -o table
az account set --subscription "<SUBSCRIPCIO_ANTIGA_NTT>"

az aks list -o table
az aks show \
  --resource-group aks-tests \
  --name apis-asincronas \
  -o json > old-aks-show.json
```

Si `get-credentials` funciona:

```bash
az aks get-credentials \
  --resource-group aks-tests \
  --name apis-asincronas \
  --overwrite-existing

kubectl get namespaces -o wide
kubectl get nodes -o wide
kubectl get all -A -o wide > old-k8s-all.txt
kubectl get pvc,pv,configmap,serviceaccount,role,rolebinding -A -o wide > old-k8s-support.txt
kubectl get secret -A -o name > old-k8s-secrets-names.txt
```

No exportar el contingut dels secrets al document final. N'hi ha prou amb deixar
constancia que s'han recreat secrets equivalents al nou entorn.

## Fase 1: crear recursos nous a Azure for Students

Executar des de Cloud Shell amb la subscripcio d'estudiant seleccionada.

El 22/05/2026 la subscripcio d'estudiant activa era:

```text
Azure for Students
SubscriptionId: 8d03409f-c1a1-4c4f-ae16-f41c58f44609
State: Enabled
```

Cloud Shell va avisar que la subscripcio encara no tenia registrat
`Microsoft.CloudShell`. Aixo no impedeix continuar, pero fa que la sessio sigui
efimera fins que es registri el provider.

També es va detectar que Azure for Students podia aplicar una politica de
regions permeses. En concret, la creacio d'un ACR a `westeurope` va fallar amb:

```text
(RequestDisallowedByAzure) Resource '<acr>' was disallowed by Azure:
This policy maintains a set of best available regions where your subscription
can deploy resources.
```

Quan passi aixo, no s'ha de continuar amb `az acr update`, perque el registre no
s'ha creat. Cal localitzar una regio permesa i crear-hi tant l'ACR com l'AKS.

La policy activa de la subscripcio d'estudiant indicava aquestes regions
permeses:

```text
polandcentral
spaincentral
austriaeast
swedencentral
francecentral
```

Per tant, la reconstruccio s'ha de fer en una d'aquestes regions, encara que el
cluster original fos a West Europe. Aquest canvi s'ha d'explicar a la memoria
perque la regio pot afectar latencies externes, disponibilitat de SKUs i cost.

Despres de seleccionar `francecentral`, l'ACR es va crear correctament:

```text
Resource group: rg-apis-asincrones-pfg
ACR: asyncpfg65454
Login server: asyncpfg65454.azurecr.io
Location: francecentral
SKU: Basic
Admin enabled: true
```

La creacio d'AKS amb `Standard_D2s_v5` va fallar per restriccio de SKU de la
subscripcio en aquesta regio. Azure va retornar una llista de mides permeses on
apareixen, entre d'altres, `standard_fx2ms_v2` i `standard_fx2mds_v2`. La decisio
següent es provar primer la mida mes petita disponible i deixar-la registrada a
la memoria si el cluster es crea correctament.

La prova amb `Standard_FX2ms_v2` tambe va fallar, aquest cop per quota:

```text
(ErrCode_InsufficientVCPUQuota) Insufficient vcpu quota requested 2,
remaining 0 for family StandardFXmsv2Family for region francecentral.
```

Per tant, abans de crear l'AKS cal identificar una combinacio regio + familia de
VM amb quota real disponible, o demanar un increment de quota. Aquest punt es
important per a la memoria: Azure for Students no nomes limita el credit, sino
tambe les regions i quotes de CPU disponibles.

La revisio de quotes amb `az vm list-usage` va mostrar que `spaincentral`,
`polandcentral`, `swedencentral`, `austriaeast` i `francecentral` tenien quota
disponible en families basiques com `Standard Bsv2 Family vCPUs` i `Standard D
Family vCPUs`. A `spaincentral`, `az vm list-skus` va confirmar SKUs petites com
`Standard_B2s_v2` i `Standard_D2s_v3`. La decisio recomanada per reconstruccio
es crear l'AKS a `spaincentral` amb `Standard_B2s_v2`, assumint que no es una
configuracio equivalent al cluster empresarial original i que serveix
principalment per recuperar el flux funcional i preparar proves documentades.

La creacio final de l'AKS va funcionar amb:

```text
Resource group: rg-apis-asincrones-pfg
AKS: aks-apis-asincrones-pfg
Location: spaincentral
Kubernetes: 1.34.7
Tier: Free
Node pool: nodepool1
Node count: 1
VM size: Standard_B2s_v2
Node image: AKSUbuntu-2204gen2containerd-202604.24.0
Container runtime: containerd 1.7.31-1
Network plugin: Azure CNI overlay
ACR attached: asyncpfg65454
```

Validacio inicial:

```text
kubectl get nodes -o wide
aks-nodepool1-10848180-vmss000000   Ready   v1.34.7
```

Aquest cluster es adequat per reconstruir el flux funcional, pero no equival al
cluster NTT original. Qualsevol resultat de rendiment obtingut en aquest entorn
s'ha d'etiquetar com a resultat del nou entorn Azure for Students.

```bash
az account list -o table
az account set --subscription "<SUBSCRIPCIO_AZURE_FOR_STUDENTS>"

export LOCATION=westeurope
export RG=rg-apis-asincrones-pfg
export AKS=aks-apis-asincrones-pfg
export ACR=asyncbenchmarkpfg

az group create \
  --name "$RG" \
  --location "$LOCATION"

az acr create \
  --resource-group "$RG" \
  --name "$ACR" \
  --sku Basic

# Necessari per generar un imagePullSecret reutilitzable pels Jobs efimers.
# En un entorn productiu seria preferible un principal de servei o workload identity.
az acr update \
  --resource-group "$RG" \
  --name "$ACR" \
  --admin-enabled true
```

Si el nom de l'ACR no esta disponible, triar un nom unic en minuscules i numeros.
Despres cal substituir totes les aparicions de `asyncbenchmarkregistry` pel nou
nom d'ACR al repositori abans de desplegar.

## Fase 2: crear AKS amb cost controlat

Per a reconstruccio funcional, crear un cluster petit. Per a mesures finals,
fixar una mida de node i no canviar-la entre execucions comparades.

```bash
az aks create \
  --resource-group "$RG" \
  --name "$AKS" \
  --location "$LOCATION" \
  --tier free \
  --node-count 1 \
  --node-vm-size Standard_D2s_v5 \
  --enable-managed-identity \
  --attach-acr "$ACR" \
  --generate-ssh-keys

az aks get-credentials \
  --resource-group "$RG" \
  --name "$AKS" \
  --overwrite-existing

kubectl get nodes -o wide
```

Si el credit baixa massa rapid, aturar el cluster quan no s'utilitzi:

```bash
az aks stop --resource-group "$RG" --name "$AKS"
az aks show --resource-group "$RG" --name "$AKS" --query powerState -o table

az aks start --resource-group "$RG" --name "$AKS"
az aks show --resource-group "$RG" --name "$AKS" --query powerState -o table
```

## Fase 3: adaptar el repositori al nou ACR

Si el nou ACR no es diu `asyncbenchmarkregistry`, substituir el nom antic.

```bash
OLD_ACR=asyncbenchmarkregistry
NEW_ACR="$ACR"

grep -RIl "$OLD_ACR" deploy-all.sh k8s packages/benchmark-orchestrator \
  | xargs sed -i "s/$OLD_ACR/$NEW_ACR/g"
```

Revisar especialment:

- `deploy-all.sh`
- `k8s/deployments/*.yaml`
- `packages/benchmark-orchestrator/src/index.ts`
- `packages/benchmark-orchestrator/README.md`

## Fase 4: crear namespaces i secrets

```bash
kubectl create namespace apis-asincrones --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace kafka-strimzi --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace brokers --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret docker-registry acr-secret \
  --namespace apis-asincrones \
  --docker-server "$ACR.azurecr.io" \
  --docker-username "$(az acr credential show -n "$ACR" --query username -o tsv)" \
  --docker-password "$(az acr credential show -n "$ACR" --query passwords[0].value -o tsv)" \
  --dry-run=client -o yaml | kubectl apply -f -
```

Si l'ACR esta adjuntat amb `--attach-acr`, el secret pot no ser necessari per als
deployments base. En aquest projecte es mante perque l'orquestrador copia
`acr-secret` als namespaces efimers dels Jobs.

## Fase 5: construir imatges i desplegar

Des de Cloud Shell, dins del repositori:

```bash
./deploy-all.sh --no-restart
```

Despres aplicar storage, deployments, services i RBAC:

```bash
kubectl apply -f k8s/storage/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/rbac/
kubectl apply -f k8s/brokers/

kubectl rollout status deployment/backstage -n apis-asincrones --timeout=240s
kubectl get pods -n apis-asincrones
```

## Fase 6: desplegar Kafka amb Strimzi

```bash
kubectl create namespace kafka-strimzi --dry-run=client -o yaml | kubectl apply -f -
kubectl create -f 'https://strimzi.io/install/latest?namespace=kafka-strimzi' -n kafka-strimzi

kubectl wait deployment/strimzi-cluster-operator \
  -n kafka-strimzi \
  --for=condition=Available \
  --timeout=300s

kubectl apply -f k8s/kafka/kafkanodepool.yaml
kubectl apply -f k8s/kafka/kafka-cluster.yaml

kubectl get pods -n kafka-strimzi
kubectl get kafka -n kafka-strimzi
```

## Fase 7: validacio minima

```bash
kubectl get pods -A
kubectl get svc -n apis-asincrones
kubectl logs -n apis-asincrones deployment/backstage --tail=80
kubectl logs -n apis-asincrones deployment/benchmark-orchestrator --tail=80
kubectl logs -n apis-asincrones deployment/metrics-api --tail=80
```

Obrir el portal amb la IP publica del servei `backstage-service`:

```bash
kubectl get svc backstage-service -n apis-asincrones
```

Prova final minima:

1. Entrar al portal.
2. Crear o seleccionar un escenari Kafka basic.
3. Executar una prova curta.
4. Confirmar que es crea un namespace `sc-*`.
5. Confirmar que el Job acaba.
6. Confirmar que apareixen metriques a Resultats.
7. Confirmar que Grafana pot llegir Elasticsearch.

## Fase 8: que s'ha d'explicar a la memoria

La memoria ha d'explicar la incidencia sense convertir-la en excusa:

- El cluster original depenia d'una subscripcio empresarial externa al projecte.
- El canvi administratiu de contracte va provocar la perdua efectiva de
  capacitat d'escriptura sobre la subscripcio.
- La solucio tecnica va ser reconstruir el desplegament en una subscripcio Azure
  for Students amb credit limitat.
- La reconstruccio valida la reproductibilitat del projecte: el repositori i els
  manifests permeten aixecar de nou la plataforma en un entorn diferent.
- Les mesures obtingudes en l'entorn nou s'han de documentar amb la seva propia
  configuracio i no barrejar-se amb mesures de l'entorn anterior si les
  condicions de node no son equivalents.
