export type ReproducibilityRow = {
  label: string;
  value: string;
};

export type ReproducibilitySnippet = {
  titol: string;
  codi: string;
};

export type ReproducibilityStatus = 'Completa' | 'Parcial' | 'No aplica';

export const KNOWN_COMPONENT_VERSIONS: Record<string, string> = {
  'apache kafka': '4.1.1',
  kafka: '4.1.1',
  'kafka protocol': '4.1.1',
  confluent: '7.6',
  'confluent platform': '7.6',
  rabbitmq: '3.13',
  'nats server': '2.12.5',
  nats: '2.12.5',
  'nats protocol': '2.12.5',
  mqtt: '5.0',
  amqp: '0.9.1',
  'amqp 0-9-1': '0.9.1',
  websocket: '13',
  ws: '13',
  grpc: '1.64',
};

const COMMON_BROKER_REPRODUCIBILITY_ROWS: ReproducibilityRow[] = [
  { label: 'Criteri igualador', value: '1 broker actiu per prova, 1 productor i 1 consumidor per run' },
  { label: 'Generador de càrrega', value: 'mateix load-generator per a totes les plataformes comparades' },
  { label: 'Warmup i durada', value: "mateixos valors definits a l'escenari abans de l'execució" },
  { label: 'Payload', value: "definit pel format de dades i visible abans de llançar el run" },
  { label: 'Persistència', value: 'retenció curta o emmagatzematge efímer per evitar contaminació entre runs' },
  { label: 'Recursos objectiu', value: 'requests i limits iguals quan el manifest és nostre' },
];

const COMMON_DECISION_REPRODUCIBILITY_ROWS: ReproducibilityRow[] = [
  { label: 'Font de veritat', value: 'queda fixat dins del document Scenario, no com a text lliure de la UI' },
  { label: 'Càrrega comparable', value: 'mateix format de dades, rate, payload, warmup i durada quan es compara amb altres opcions' },
  { label: 'Execució neta', value: 'cada run ha de crear identificadors propis per no heretar estat de proves anteriors' },
];

export const REPRODUCIBILITY_BY_PLATFORM: Record<string, ReproducibilityRow[]> = {
  'Apache Kafka': [
    ...COMMON_BROKER_REPRODUCIBILITY_ROWS,
    { label: 'Producte', value: 'Apache Kafka' },
    { label: 'Versió usada', value: '4.1.1' },
    { label: 'Operador/chart', value: 'Strimzi amb KRaft i node pool dual-role' },
    { label: 'Namespace', value: 'kafka-strimzi' },
    { label: 'Port client', value: '9092 dins del clúster' },
    { label: 'Topologia', value: '1 rèplica amb rol controller + broker' },
    { label: 'Particions', value: '1 partició per topic de run' },
    { label: 'Replicació', value: 'factor 1 per mantenir un cost comparable amb la resta' },
    { label: 'Compatibilitat forta', value: 'arquitectura Log-Centric i protocol Kafka' },
    { label: 'Vídeo 8K', value: 'compatible quan el payload final és acceptat pel productor i pel topic del run' },
  ],
  'Confluent Platform': [
    ...COMMON_BROKER_REPRODUCIBILITY_ROWS,
    { label: 'Producte', value: 'plataforma Kafka-compatible usada com a alternativa Confluent dins del benchmark' },
    { label: 'Versió declarada', value: '7.6 a la fitxa de compatibilitat del projecte' },
    { label: 'Instal·lació', value: 'Helm chart Kafka-compatible al namespace brokers' },
    { label: 'Namespace', value: 'brokers' },
    { label: 'Port client', value: '9092 dins del clúster' },
    { label: 'Topologia', value: 'single-node' },
    { label: 'Compatibilitat forta', value: 'protocol Kafka i escenaris de log/streaming' },
    { label: 'Nota de reproductibilitat', value: 'cal documentar si el desplegament real és Confluent o una API Kafka compatible' },
  ],
  RabbitMQ: [
    ...COMMON_BROKER_REPRODUCIBILITY_ROWS,
    { label: 'Producte', value: 'RabbitMQ Management' },
    { label: 'Versió usada', value: '3.13' },
    { label: 'Imatge/chart', value: 'rabbitmq:3.13-management o Bitnami RabbitMQ equivalent' },
    { label: 'Namespace', value: 'brokers' },
    { label: 'Port client', value: '5672' },
    { label: 'Port monitoratge', value: '15672' },
    { label: 'Cues', value: 'classic queues efímeres per run' },
    { label: 'Compatibilitat forta', value: 'arquitectura Queue-Based i protocol AMQP' },
    { label: 'Vídeo 8K', value: 'compatible si la cua accepta el payload i el consumidor confirma correctament' },
  ],
  'NATS Server': [
    ...COMMON_BROKER_REPRODUCIBILITY_ROWS,
    { label: 'Producte', value: 'NATS Server' },
    { label: 'Versió usada', value: '2.12.5 segons logs del pod nats-0' },
    { label: 'Instal·lació', value: 'Helm chart oficial nats/nats' },
    { label: 'Namespace', value: 'brokers' },
    { label: 'Port client', value: '4222' },
    { label: 'Port monitoratge', value: '8222 via svc/nats-headless' },
    { label: 'Topologia', value: 'single-node + JetStream quan el chart el desplega' },
    { label: 'Payload màxim', value: '4 MB / 4194304 bytes' },
    { label: 'Compatibilitat forta', value: 'Event-Driven, Event-Mesh, SEA i protocol NATS' },
    { label: 'Vídeo 8K', value: 'compatible només si /varz mostra "max_payload": 4194304' },
  ],
};

const PLATFORM_REPRODUCIBILITY_ALIASES: Record<string, string> = {
  Kafka: 'Apache Kafka',
  Confluent: 'Confluent Platform',
  NATS: 'NATS Server',
};

const COMPONENT_SNIPPET_ALIASES: Record<string, string> = {
  EDA: 'Event-Driven Architecture',
  QBA: 'Queue-Based Architecture',
  LCA: 'Log-Centric Architecture',
  EMA: 'Event-Mesh Architecture',
  SEA: 'Streaming Events Architecture',
  Kafka: 'Kafka Protocol',
  NATS: 'NATS Protocol',
};

const EDA_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Què representa', value: 'productors i consumidors desacoblats que intercanvien esdeveniments mitjançant un broker' },
  { label: 'Com es replica', value: 'mateix broker, mateix protocol, mateix subject/topic/queue per run i mateixa configuració de càrrega' },
  { label: 'Variables que cal fixar', value: 'nombre de productors, nombre de consumidors, payload, rate, durada i política de confirmació' },
  { label: 'Lectura dels resultats', value: 'la latència mesurada és la del missatge complet entre productor i consumidor' },
];

const QBA_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Què representa', value: 'missatges posats en una cua i consumits amb confirmació quan el protocol ho permet' },
  { label: 'Com es replica', value: 'cua efímera per run, 1 consumidor actiu i ACK del consumidor si la plataforma ho suporta' },
  { label: 'Variables que cal fixar', value: "prefetch, ACK, durada, rate, payload i nom de cua per execució" },
  { label: 'Lectura dels resultats', value: 'és bona per comparar absorció de càrrega i estabilitat del consum' },
];

const LCA_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Què representa', value: 'missatges escrits en un log ordenat, normalment amb offsets o grups de consum' },
  { label: 'Com es replica', value: 'topic nou per run o group-id efímer per evitar offsets antics' },
  { label: 'Variables que cal fixar', value: 'particions, replicació, acks, group-id, retenció i payload' },
  { label: 'Lectura dels resultats', value: 'és la referència natural per Kafka i plataformes Kafka-compatibles' },
];

const EMA_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Què representa', value: "encaminament d'esdeveniments entre productors, brokers/gateways i consumidors" },
  { label: 'Com es replica', value: "declarant sempre plataforma, protocol, gateway si existeix i regla d'encaminament usada" },
  { label: 'Variables que cal fixar', value: 'ruta, format de dades, rate, payload i política de reintent' },
  { label: 'Lectura dels resultats', value: "només és defensable si queda clar quin component fa d'encaminador" },
];

const SEA_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Què representa', value: "flux continu d'esdeveniments, pensat per consum sostingut i lectura incremental" },
  { label: 'Com es replica', value: 'stream, topic o subject per run amb consumidor iniciat abans de la mesura' },
  { label: 'Variables que cal fixar', value: 'payload, rate, durada, mida de batch si aplica i política de retenció' },
  { label: 'Lectura dels resultats', value: 'serveix per comparar throughput i latència en fluxos continus' },
];

const KAFKA_PROTOCOL_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Transport', value: 'protocol Kafka sobre el port 9092 del broker compatible' },
  { label: 'Com es replica', value: 'topic per run, producer amb acks declarats i group-id efímer al consumidor' },
  { label: 'Plataformes compatibles', value: 'Apache Kafka i Confluent/Kafka-compatible' },
  { label: 'Variable crítica', value: 'particions, acks i offsets, perquè canvien latència i throughput' },
];

const AMQP_PROTOCOL_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Transport', value: 'AMQP 0.9.1 sobre el port 5672' },
  { label: 'Com es replica', value: 'exchange/queue efímers per run i ACK del consumidor quan aplica' },
  { label: 'Plataformes compatibles', value: 'RabbitMQ com a referencia principal del portal' },
  { label: 'Variable crítica', value: 'ACK, prefetch i tipus de cua, perquè afecten estabilitat i pèrdua' },
];

const MQTT_PROTOCOL_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Transport', value: 'MQTT 5.0, orientat a publish/subscribe lleuger' },
  { label: 'Com es replica', value: 'topic per run, QoS declarat i client-id efímer per execució' },
  { label: 'Plataformes compatibles', value: 'brokers MQTT quan estiguin activats al portal' },
  { label: 'Variable crítica', value: 'QoS i mida de payload, especialment en telemetria IoT' },
];

const GRPC_PROTOCOL_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Transport', value: 'gRPC streaming entre gateway i consumidor quan hi ha gateway compatible' },
  { label: 'Com es replica', value: 'mateix servei, mateix mètode streaming i mateix esquema de missatge' },
  { label: 'Plataformes compatibles', value: 'necessita gateway o adaptador; no tots els brokers el parlen directament' },
  { label: 'Variable crítica', value: 'serialització, connexió persistent i mida del missatge' },
];

const WS_PROTOCOL_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Transport', value: "WebSocket cap al consumidor final, normalment a través d'un gateway" },
  { label: 'Com es replica', value: "mateix endpoint, mateix protocol d'autenticació si existeix i mateix payload" },
  { label: 'Plataformes compatibles', value: 'brokers amb gateway WebSocket o adaptador propi' },
  { label: 'Variable crítica', value: 'connexió persistent, backpressure i mida dels missatges enviats al client' },
];

const NATS_PROTOCOL_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Transport', value: 'protocol NATS sobre el port 4222' },
  { label: 'Com es replica', value: "subject per run i preflight de max_payload abans d'enviar payloads grans" },
  { label: 'Plataformes compatibles', value: 'NATS Server' },
  { label: 'Variable crítica', value: 'max_payload, JetStream si aplica i política de subscripció' },
];

export const REPRODUCIBILITY_BY_COMPONENT_NAME: Record<string, ReproducibilityRow[]> = {
  'Event-Driven Architecture': EDA_ROWS,
  EDA: EDA_ROWS,
  'Queue-Based Architecture': QBA_ROWS,
  QBA: QBA_ROWS,
  'Log-Centric Architecture': LCA_ROWS,
  LCA: LCA_ROWS,
  'Event-Mesh Architecture': EMA_ROWS,
  EMA: EMA_ROWS,
  'Streaming Events Architecture': SEA_ROWS,
  SEA: SEA_ROWS,
  'Kafka Protocol': KAFKA_PROTOCOL_ROWS,
  Kafka: KAFKA_PROTOCOL_ROWS,
  AMQP: AMQP_PROTOCOL_ROWS,
  'AMQP 0-9-1': AMQP_PROTOCOL_ROWS,
  MQTT: MQTT_PROTOCOL_ROWS,
  'MQTT 5.0': MQTT_PROTOCOL_ROWS,
  gRPC: GRPC_PROTOCOL_ROWS,
  GRPC: GRPC_PROTOCOL_ROWS,
  WebSocket: WS_PROTOCOL_ROWS,
  WS: WS_PROTOCOL_ROWS,
  'NATS Protocol': NATS_PROTOCOL_ROWS,
  NATS: NATS_PROTOCOL_ROWS,
};

export const REPRODUCIBILITY_SNIPPETS: Record<string, ReproducibilitySnippet> = {
  'Apache Kafka': {
    titol: 'Verificar Kafka via Strimzi al clúster',
    codi: [
      'kubectl get pods -n kafka-strimzi',
      'kubectl get kafka -n kafka-strimzi',
      'kubectl get kafkanodepool -n kafka-strimzi',
      'kubectl logs -n kafka-strimzi -l strimzi.io/name=kafka-cluster-kafka',
    ].join('\n'),
  },
  'Confluent Platform': {
    titol: 'Verificar la plataforma Kafka-compatible',
    codi: [
      'kubectl get pods -n brokers',
      'kubectl get svc -n brokers',
      'kubectl logs -n brokers -l app.kubernetes.io/name=redpanda',
    ].join('\n'),
  },
  RabbitMQ: {
    titol: 'Verificar RabbitMQ',
    codi: [
      'kubectl get pods -n brokers -l app.kubernetes.io/name=rabbitmq',
      'kubectl get svc -n brokers | grep rabbitmq',
      'kubectl logs -n brokers -l app.kubernetes.io/name=rabbitmq',
    ].join('\n'),
  },
  'NATS Server': {
    titol: 'Verificar NATS i el max_payload',
    codi: [
      'kubectl get pods -n brokers | grep nats',
      'kubectl port-forward -n brokers svc/nats-headless 8222:8222',
      'curl -s http://127.0.0.1:8222/varz | grep max_payload',
      'kubectl logs -n brokers -l app.kubernetes.io/name=nats',
    ].join('\n'),
  },
  'Event-Driven Architecture': {
    titol: 'Contracte mínim per reproduir EDA',
    codi: [
      'architecture: EDA',
      'broker: <kafka | rabbitmq | nats>',
      'protocol: <protocol compatible>',
      'runIsolation: scenarioId + runId',
      'load: same format, rate, payload, warmup, duration',
    ].join('\n'),
  },
  'Queue-Based Architecture': {
    titol: 'Contracte mínim per reproduir QBA',
    codi: [
      'architecture: QBA',
      'queue: benchmark-${scenarioId}-${runId}',
      'consumerAck: true',
      'producerCount: 1',
      'consumerCount: 1',
    ].join('\n'),
  },
  'Log-Centric Architecture': {
    titol: 'Contracte mínim per reproduir LCA',
    codi: [
      'architecture: LCA',
      'topic: benchmark-${scenarioId}-${runId}',
      'consumerGroup: benchmark-${runId}',
      'partitions: 1',
      'acks: declared in scenario',
    ].join('\n'),
  },
  'Event-Mesh Architecture': {
    titol: 'Contracte mínim per reproduir EMA',
    codi: [
      'architecture: EMA',
      'route: producer -> broker/gateway -> consumer',
      'routingRule: declared in scenario',
      'gateway: enabled only when the selected protocol needs it',
    ].join('\n'),
  },
  'Streaming Events Architecture': {
    titol: 'Contracte mínim per reproduir SEA',
    codi: [
      'architecture: SEA',
      'stream: benchmark-${scenarioId}-${runId}',
      'consumerStartsBeforeMeasurement: true',
      'retention: short or ephemeral',
      'load: continuous during the full benchmark duration',
    ].join('\n'),
  },
  'Kafka Protocol': {
    titol: 'Contracte mínim del protocol Kafka',
    codi: [
      'protocol: Kafka',
      'port: 9092',
      'topic: benchmark-${scenarioId}-${runId}',
      'consumerGroup: benchmark-${runId}',
      'acks: declared in scenario',
    ].join('\n'),
  },
  AMQP: {
    titol: 'Contracte mínim del protocol AMQP',
    codi: [
      'protocol: AMQP',
      'port: 5672',
      'queue: benchmark-${scenarioId}-${runId}',
      'consumerAck: true',
      'prefetch: declared in scenario when used',
    ].join('\n'),
  },
  MQTT: {
    titol: 'Contracte mínim del protocol MQTT',
    codi: [
      'protocol: MQTT',
      'topic: benchmark/${scenarioId}/${runId}',
      'qos: declared in scenario',
      'clientId: benchmark-${runId}',
    ].join('\n'),
  },
  gRPC: {
    titol: 'Contracte mínim del protocol gRPC',
    codi: [
      'protocol: gRPC',
      'mode: streaming',
      'service: declared in gateway adapter',
      'messageSchema: same payload format for every compared run',
    ].join('\n'),
  },
  WS: {
    titol: 'Contracte mínim del protocol WebSocket',
    codi: [
      'protocol: WS',
      'endpoint: /stream/${scenarioId}/${runId}',
      'connection: persistent',
      'payload: same format and size as the selected scenario',
    ].join('\n'),
  },
  'NATS Protocol': {
    titol: 'Contracte mínim del protocol NATS',
    codi: [
      'protocol: NATS',
      'port: 4222',
      'subject: benchmark.${scenarioId}.${runId}',
      'preflight: check /varz max_payload before large payload runs',
    ].join('\n'),
  },
};

function normalizeComponentKey(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function hasNamedRows(componentName: string, shortName: string): boolean {
  return Boolean(REPRODUCIBILITY_BY_COMPONENT_NAME[componentName] || REPRODUCIBILITY_BY_COMPONENT_NAME[shortName]);
}

function getPlatformReproducibilityRows(componentName: string, shortName: string): ReproducibilityRow[] | null {
  const directRows = REPRODUCIBILITY_BY_PLATFORM[componentName] || REPRODUCIBILITY_BY_PLATFORM[shortName];
  if (directRows) {
    return directRows;
  }

  const aliasedName = PLATFORM_REPRODUCIBILITY_ALIASES[componentName] || PLATFORM_REPRODUCIBILITY_ALIASES[shortName];
  return aliasedName ? REPRODUCIBILITY_BY_PLATFORM[aliasedName] || null : null;
}

function getPlatformReproducibilitySnippet(componentName: string, shortName: string): ReproducibilitySnippet | null {
  const directSnippet = REPRODUCIBILITY_SNIPPETS[componentName] || REPRODUCIBILITY_SNIPPETS[shortName];
  if (directSnippet) {
    return directSnippet;
  }

  const aliasedName = PLATFORM_REPRODUCIBILITY_ALIASES[componentName] || PLATFORM_REPRODUCIBILITY_ALIASES[shortName];
  return aliasedName ? REPRODUCIBILITY_SNIPPETS[aliasedName] || null : null;
}

function getComponentReproducibilitySnippet(componentName: string, shortName: string): ReproducibilitySnippet | null {
  const directSnippet = REPRODUCIBILITY_SNIPPETS[componentName] || REPRODUCIBILITY_SNIPPETS[shortName];
  if (directSnippet) {
    return directSnippet;
  }

  const aliasedName = COMPONENT_SNIPPET_ALIASES[componentName] || COMPONENT_SNIPPET_ALIASES[shortName];
  return aliasedName ? REPRODUCIBILITY_SNIPPETS[aliasedName] || null : null;
}

export function getKnownComponentVersion(component: any): string {
  const shortName = normalizeComponentKey(component?.shortName);
  const componentName = normalizeComponentKey(component?.name);

  if (componentName && KNOWN_COMPONENT_VERSIONS[componentName]) {
    return KNOWN_COMPONENT_VERSIONS[componentName];
  }

  if (shortName && KNOWN_COMPONENT_VERSIONS[shortName]) {
    return KNOWN_COMPONENT_VERSIONS[shortName];
  }

  if (component && component.version) {
    return String(component.version);
  }

  return '';
}

export function getReproducibilityRows(component: any): ReproducibilityRow[] | null {
  if (!component) {
    return null;
  }

  const componentName = String(component.name || '');
  const shortName = String(component.shortName || '');

  if (component.category === 'platform') {
    const platformRows = getPlatformReproducibilityRows(componentName, shortName);
    if (platformRows) {
      return platformRows;
    }
  }

  const explicitRows = REPRODUCIBILITY_BY_COMPONENT_NAME[componentName] || REPRODUCIBILITY_BY_COMPONENT_NAME[shortName];
  if (explicitRows) {
    return explicitRows;
  }

  if (component.category === 'platform') {
    return [
      ...COMMON_BROKER_REPRODUCIBILITY_ROWS,
      { label: 'Namespace', value: 'brokers' },
      { label: 'Producte', value: componentName || shortName || 'plataforma no especificada' },
    ];
  }

  if (component.category === 'architecture' || component.category === 'protocol') {
    return [
      ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
      { label: 'Definició', value: "s'aplica dins d'un escenari amb plataforma, format, rate i durada concrets" },
      { label: 'Reproductibilitat', value: 'no és un producte desplegat; és una decisió del contracte Scenario' },
    ];
  }

  return null;
}

export function getReproducibilitySnippet(component: any): ReproducibilitySnippet | null {
  if (!component) {
    return null;
  }

  const componentName = String(component.name || '');
  const shortName = String(component.shortName || '');

  if (component.category === 'platform') {
    return getPlatformReproducibilitySnippet(componentName, shortName);
  }

  return getComponentReproducibilitySnippet(componentName, shortName);
}

export function getReproducibilityStatus(component: any): ReproducibilityStatus {
  if (!component) {
    return 'No aplica';
  }

  const componentName = String(component.name || '');
  const shortName = String(component.shortName || '');

  if (component.category === 'platform') {
    return 'Completa';
  }

  if (hasNamedRows(componentName, shortName)) {
    return 'Completa';
  }

  if (component.category === 'architecture' || component.category === 'protocol') {
    return 'Parcial';
  }

  return 'No aplica';
}
