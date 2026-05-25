# APIs Asíncrones - Portal de proves

Portal web basat en Backstage per crear, executar i comparar proves d'APIs asíncrones sobre Azure Kubernetes Service. El projecte permet definir escenaris amb una arquitectura, un protocol, una plataforma de missatgeria i un format de dades, executar-los com a Jobs de Kubernetes i consultar-ne els resultats amb mètriques persistides.

Projecte de Final de Grau. Universitat de Girona. Marc Font. 2026.

## Objectiu

L'objectiu no és només desplegar brokers, sinó oferir una eina reproduïble per comparar combinacions d'arquitectura, protocol, plataforma i càrrega amb dades defensables. Per això el portal controla la configuració de cada escenari, separa les execucions pendents de les que realment estan corrent i desa les mostres a Elasticsearch per poder comparar-les després.

## Què fa el portal

| Pàgina | Funció |
|---|---|
| Home | Dona context: què és un broker, com circulen els missatges i com s'usa el portal. |
| Catàleg | Mostra arquitectures, protocols i plataformes, amb compatibilitat i reproduïbilitat. |
| Escenaris | Permet crear, editar, duplicar, executar i aturar escenaris. |
| Execucions | Mostra l'estat dels runs: pendent, en execució, completat, fallit o cancel·lat. |
| Resultats | Compara mètriques històriques, puntuació i detall de cada run. |
| Settings | Canvia idioma i tema visual. |

El text visible està preparat en català, castellà i anglès.

## Estat actual

- El portal funciona amb Backstage 1.47, React 18 i TypeScript.
- Els microserveis s'exposen darrere del proxy de Backstage.
- Els resultats es desen a Elasticsearch i es poden explorar també amb Grafana.
- El catàleg inclou 15 components: 5 arquitectures, 6 protocols i 4 plataformes.
- SEA correspon a Serverless Event Architecture.
- Confluent es tracta com a plataforma pròpia al portal, però en aquesta fase s'executa pel camí Kafka-compatible del clúster.
- Les proves finals s'han executat de forma serial amb 16 escenaris: 4 plataformes per 4 formats de dades.

## Arquitectura

El sistema viu dins un clúster AKS. Els serveis del portal es despleguen al namespace `apis-asincrones`, els brokers al namespace `brokers` i cada prova crea un namespace efímer `sc-*`. Aquesta separació ajuda a veure i netejar cada execució, però la comparació justa depèn sobretot de mantenir constants el payload, la durada, el ritme d'enviament, el warm-up, els recursos i la concurrència.

```mermaid
flowchart TB
    user(["Usuari"]) --> backstage["Backstage UI<br/>plugin async-benchmark"]

    subgraph aks["AKS"]
        subgraph app["ns: apis-asincrones"]
            backstage
            catalog["catalog-service :3001"]
            scenario["scenario-service :3002"]
            orchestrator["benchmark-orchestrator :3003"]
            metrics["metrics-api :3004"]
            es[("Elasticsearch")]
            grafana["Grafana"]
        end

        subgraph brokers["ns: brokers"]
            kafkaBroker["Kafka Strimzi"]
            rabbit["RabbitMQ"]
            nats["NATS"]
        end

        subgraph runs["ns: sc-*"]
            loadgen["load-generator<br/>Job efímer"]
        end
    end

    backstage --> catalog
    backstage --> scenario
    backstage --> orchestrator
    backstage --> metrics
    orchestrator --> loadgen
    loadgen --> kafkaBroker
    loadgen --> rabbit
    loadgen --> nats
    loadgen --> metrics
    metrics --> es
    grafana --> es
```

## Flux d'una prova

1. L'usuari crea o tria un escenari.
2. El portal envia la petició al backend de Backstage.
3. Backstage fa proxy cap al `benchmark-orchestrator`.
4. L'orquestrador deixa el run en pendent si el límit de concurrència està ple.
5. Quan hi ha lloc, crea un namespace `sc-*` i un Job amb el `load-generator`.
6. El generador publica i consumeix missatges al broker triat.
7. El generador envia snapshots a `metrics-api` cada 5 segons.
8. `metrics-api` persisteix les mostres a Elasticsearch.
9. Resultats i Grafana llegeixen les dades guardades.

## Concurrència de proves

El clúster final s'ha treballat amb tres nodes AKS. El portal pot mostrar cua i executar diversos runs, però per a resultats finals comparables s'ha de fer servir `MAX_CONCURRENT_RUNS=1`. Així només hi ha un generador de càrrega actiu i s'evita barrejar soroll de CPU, memòria, xarxa i broker.

`MAX_CONCURRENT_RUNS=3` només és recomanable per a demo ràpida, quan interessa ensenyar la cua i veure tres execucions avançant alhora. En aquest cas els resultats són útils funcionalment, però menys estrictes per a la memòria.

Els Jobs de càrrega poden usar el selector `benchmark-role=loadgen`. Després de recrear un node pool d'AKS, cal revisar que el label encara existeix:

```powershell
kubectl get nodes -L benchmark-role
```

## Escenaris finals

Les proves finals es documenten com una matriu de 16 execucions: cada plataforma es prova amb cada format de dades.

| Plataforma | Arquitectura | Protocol | Formats |
|---|---|---|---|
| RabbitMQ | QBA | AMQP | Financer, IoT, Vídeo 4K, Vídeo 8K |
| NATS Server | EDA | NATS | Financer, IoT, Vídeo 4K, Vídeo 8K |
| Apache Kafka | LCA | Kafka | Financer, IoT, Vídeo 4K, Vídeo 8K |
| Confluent | LCA | Kafka | Financer, IoT, Vídeo 4K, Vídeo 8K |

La lectura principal s'ha de fer per format. Primer es comparen les quatre plataformes dins d'un mateix format i després es fa la lectura transversal entre formats.

## Estats

| Estat | Significat |
|---|---|
| Pendent | El run és a la cua i encara no ha creat Job ni mètriques. |
| En execució | El Job existeix i publica snapshots. |
| Completat | La prova ha acabat i la mostra final s'ha guardat. |
| Fallit | El broker, el Job o la ingesta de mètriques han fallat. |
| Cancel·lat | L'usuari ha aturat la prova manualment. |

## Estructura del repositori

```text
apis-asincrones/
|-- packages/
|   |-- app/                    # Frontend Backstage
|   |-- backend/                # Backend Backstage i proxy
|   |-- catalog-service/        # Catàleg de components
|   |-- scenario-service/       # CRUD d'escenaris
|   |-- benchmark-orchestrator/ # Cua i Jobs de Kubernetes
|   |-- load-generator/         # Generador de càrrega
|   `-- metrics-api/            # REST, WebSocket i persistència de mètriques
|-- plugins/
|   `-- async-benchmark/        # Plugin visible del portal
|-- k8s/                        # Manifests AKS
|-- docs/                       # Documentació tècnica
|-- scripts/                    # Scripts auxiliars
|-- deploy-all.sh               # Build, push i restart
`-- app-config.yaml             # Configuració local de Backstage
```

## Stack

| Capa | Tecnologia |
|---|---|
| Portal | Backstage 1.47, React 18, TypeScript |
| Monorepo | Yarn 4 |
| Microserveis | Node.js, Express i TypeScript |
| Persistència | Elasticsearch |
| Execució | Azure Kubernetes Service |
| Brokers | Kafka amb Strimzi, RabbitMQ i NATS |
| Observabilitat | Metrics API, WebSocket i Grafana |

## Engegada local

```bash
corepack enable
corepack yarn install --immutable
corepack yarn start
```

Serveis locals principals:

| Servei | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend Backstage | http://localhost:7007 |

Els microserveis i brokers reals normalment s'executen a AKS. Per a execucions locals cal tenir Elasticsearch i configurar les variables d'entorn corresponents.

## Validació

```bash
npx tsc --noEmit
corepack yarn lint:all
corepack yarn build:all
```

Notes:

- `corepack yarn install --immutable` no ha de modificar `yarn.lock`.
- `corepack yarn lint:all` revisa tot el monorepo.
- `corepack yarn lint` només revisa canvis respecte la branca base configurada.

## Desplegament a AKS

Aplicació base:

```bash
kubectl create namespace apis-asincrones --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace brokers --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f k8s/storage/
kubectl apply -f k8s/deployments/
kubectl apply -f k8s/services/
kubectl apply -f k8s/rbac/
kubectl apply -f k8s/brokers/

kubectl apply -f 'https://strimzi.io/install/latest?namespace=brokers' -n brokers
kubectl wait deployment/strimzi-cluster-operator -n brokers --for=condition=Available --timeout=300s
kubectl apply -f k8s/kafka/
```

Build, push i restart:

```bash
./deploy-all.sh
bash scripts/configure-backstage-public-url.sh
```

Si Azure for Students bloqueja `az acr build` amb `TasksOperationsNotAllowed`, cal usar el workflow manual de GitHub Actions `Build ACR images` i després reiniciar:

```bash
./deploy-all.sh --restart-only
```

## Resultats i puntuació

El detall d'un resultat mostra configuració, estat final, missatges enviats i rebuts, latència mitjana, P50, P95, P99, throughput i taxa d'error. La puntuació és una ajuda visual per ordenar resultats, però l'anàlisi de la memòria s'ha de defensar amb les mètriques concretes i amb la configuració de cada prova.

Per comparar correctament, filtra primer per format de dades i compara les quatre plataformes dins del mateix format. Després revisa la lectura global.

## Documentació addicional

- [docs/README.md](docs/README.md): índex de documentació tècnica.
- [packages/README.md](packages/README.md): app i microserveis.
- [plugins/README.md](plugins/README.md): plugin Backstage.
- [k8s/README.md](k8s/README.md): manifests AKS.

## Autoria

| Persona | Rol |
|---|---|
| Marc Font | Estudiant i autor |
| Jerónimo Hernández González | Tutor UdG |
| David Teres Carrillo | Tutor empresa |

Repositori acadèmic sense llicència pública definida. Qualsevol reutilització fora del PFG s'hauria d'autoritzar explícitament amb l'autor i els tutors.
