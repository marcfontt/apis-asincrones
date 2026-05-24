# Registre de canvis recents

Aquest document resumeix els canvis fets durant la fase final d'ajust del
projecte. Serveix per actualitzar el prompt de treball i per deixar constancia
del que s'ha modificat a ultima hora.

## Infraestructura i AKS

- Es va descartar operar el cluster antic de NTT perque la subscripcio estava
  deshabilitada o en mode nomes lectura.
- Es va reconstruir el desplegament a Azure for Students, regio `spaincentral`.
- Es va crear o reutilitzar l'ACR `asyncpfg65454.azurecr.io`.
- El cluster va passar d'1 node a 3 nodes `Standard_B2s_v2` per poder mantenir
  portal, Elasticsearch, Kafka, NATS, RabbitMQ i generadors de carrega.
- Es va etiquetar el node de carrega amb `benchmark-role=loadgen`.
- Es va documentar que `MAX_CONCURRENT_RUNS=3` és el perfil rapid de demo i que
  `MAX_CONCURRENT_RUNS=1` és el perfil recomanat per mesures estrictes.

## Brokers i endpoints

- Kafka queda com a broker Strimzi dins del namespace `brokers`.
- Confluent queda representat com a cami Kafka-compatible sobre el bootstrap de
  Kafka, no com una distribucio completa de Confluent Platform.
- Es va corregir Confluent de `redpanda.brokers.svc.cluster.local:9093` a
  `kafka-cluster-kafka-bootstrap.brokers.svc.cluster.local:9092`.
- Es va corregir NATS a `nats://nats.brokers.svc.cluster.local:4222`.
- RabbitMQ queda a
  `amqp://admin:<password>@rabbitmq.brokers.svc.cluster.local:5672`.

## Orquestrador i execucions

- `benchmark-orchestrator` valida endpoints de broker abans de crear un Job.
- Els runs tenen ara estats clars: `pending`, `running`, `completed`,
  `failed` i `cancelled`.
- S'ha afegit cua interna per evitar crear 16 Jobs simultanis a Kubernetes.
- `/runs/active` retorna runs pendents i en curs.
- `/health` mostra `maxConcurrentRuns`, `queuedRuns` i `runningRuns`.
- En cancel.lar un run, l'estat del scenario queda com `cancelled`.
- Quan un run falla, el scenario queda com `failed`; quan acaba, com
  `completed`.

## Load generator

- El generador s'ha mantingut simple i determinista.
- Kafka i Confluent comparteixen camí Kafka-compatible.
- NATS i RabbitMQ publiquen i consumeixen directament contra els serveis finals.
- Les mostres finals inclouen `status` perquè la UI pugui tancar correctament
  la lectura del run.
- Per payloads de `video-8k`, el camí Kafka ara ajusta topic
  `max.message.bytes` i fetch del consumidor. El manifest de Kafka també fixa
  `socket.request.max.bytes` per no castigar Kafka/Confluent per un límit de
  configuració.

## Interficie

- Resultats en directe mostra a la fila principal només runs en curs.
- Els runs pendents apareixen com a indicador compacte de cua perquè no tapin
  les mètriques principals.
- Escenaris mostra si un scenario esta pendent, en execucio, completat, fallit
  o aturat.
- Execucions recupera els filtres i estats anteriors, incloent pendent.
- Els filtres d'Execucions s'han alineat amb la resta de pantalles.
- La guia integrada d'Escenaris explica què vol dir cada estat.
- El tutorial indica accions concretes: quin botó clicar, on obrir fitxes, on
  revisar compatibilitat i on configurar el sistema.
- El tutorial s'ha reescrit en forma de passos clicables: `Home`, `Catàleg`,
  `Escenaris`, `Execucions`, `Resultats`, filtres, pestanyes i files.
- Home explica millor el paper d'un broker amb una lectura progressiva:
  productor, broker, consumidor i mètrica.
- Escenaris queda reduït a quatre presets finals: financer amb RabbitMQ, IoT
  amb NATS, vídeo 4K amb Kafka i vídeo 8K pel camí Kafka-compatible de
  Confluent. Així els exemples finals cobreixen també el format 8K.

## Catàleg i reproductibilitat

- El cataleg sincronitza components predefinits que falten sense esborrar dades
  existents.
- `SEA` queda inclosa com a arquitectura predefinida; el cataleg final suma 15
  components.
- La pàgina del catàleg força una sincronització del seed si detecta que
  Elasticsearch encara no conté algun component base com `SEA`.
- Les categories arquitectura, protocol i plataforma s'han simplificat per ser
  mes entenedores.
- Les fitxes documenten versions i limitacions:
  - Kafka `4.1.1`.
  - RabbitMQ `3.13`.
  - NATS Server `2.12.5`.
  - Confluent com a cami Kafka-compatible, no com a plataforma completa.
- La pestanya de reproductibilitat s'ha simplificat en targetes curtes per
  evitar repetir temps de prova, generador i payload a cada component.

## Documentació i memòria

- S'ha ampliat la guia operativa d'AKS amb cua, estats, concurrència i
  repartiment de nodes.
- S'ha actualitzat la guia de migracio amb el desplegament final, costos
  estimats i explicacio de la decisio Azure for Students.
- S'ha afegit el fragment `docs/memoria-actualitzacio-aks.tex` per enganxar o
  adaptar a la memòria.
- S'ha afegit aquest registre per tenir una llista clara de canvis recents.
- `docs/aplicar-canvis-finals.md` queda com a checklist curta per reconstruir
  imatges, aplicar manifests, reiniciar serveis i validar la UI final.

## Nota per a futurs prompts

Quan es reprengui el projecte, cal assumir que el comportament correcte ja no és
"llençar-ho tot a Kubernetes". El comportament correcte és:

1. Crear tots els runs que calgui des del portal.
2. Deixar que l'orquestrador en posi com a maxim 3 en execucio per a demo.
3. Mostrar la resta com a pendents.
4. Repetir amb `MAX_CONCURRENT_RUNS=1` qualsevol comparació que hagi d'entrar a
   la memòria com a dada estricta.
