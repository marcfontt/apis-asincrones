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

// Text visible al modal del Catàleg.
// Explica que cal repetir per comparar brokers sense canviar les condicions.
const COMMON_BROKER_REPRODUCIBILITY_ROWS: ReproducibilityRow[] = [
  { label: 'Què has de repetir', value: "Mateixa plataforma, protocol, format, rate, payload, warm-up i durada. Si canvies una peça, ja és una prova diferent." },
  { label: 'Canal per run', value: 'El load-generator crea un topic, cua, subject o group-id propi amb el runId. Així no barreja missatges antics.' },
  { label: 'Concurrència', value: 'Per dades finals, executa pocs runs alhora o usa node pool dedicat. El paral·lelisme és útil per demo, no per defensar números.' },
];

// Text comu per arquitectures i protocols.
// Marca els paràmetres que l'usuari ha de deixar igual abans de comparar.
const COMMON_DECISION_REPRODUCIBILITY_ROWS: ReproducibilityRow[] = [
  { label: 'On entra al codi', value: "L'escenari desa arquitectura, plataforma, protocol i format; l'orquestrador ho passa al load-generator com a variables d'entorn." },
  { label: 'Què queda fix', value: 'Per comparar, mantén iguals format, rate, payload, warm-up, durada i concurrència.' },
  { label: 'Aïllament', value: 'Cada execució té runId i canal propis perquè les mètriques no heretin dades anteriors.' },
];

export const REPRODUCIBILITY_BY_PLATFORM: Record<string, ReproducibilityRow[]> = {
  'Apache Kafka': [
    ...COMMON_BROKER_REPRODUCIBILITY_ROWS,
    { label: 'Versió', value: 'Apache Kafka 4.1.1 sobre Strimzi amb KRaft.' },
    { label: 'Endpoint', value: 'kafka-cluster-kafka-bootstrap.brokers.svc.cluster.local:9092.' },
    { label: 'Ús recomanat', value: 'Streaming i logs amb topics efímers per run.' },
    { label: 'Payload gran', value: 'Per 8K cal mantenir topic.max.message.bytes, fetch i socket request per sobre de 2 MB.' },
  ],
  Confluent: [
    ...COMMON_BROKER_REPRODUCIBILITY_ROWS,
    { label: 'Versió', value: 'Camí Kafka-compatible 4.1.1 dins del clúster.' },
    { label: 'Endpoint', value: 'Utilitza el mateix bootstrap Kafka-compatible que Kafka, però queda etiquetat com a plataforma Confluent.' },
    { label: 'Què mesura', value: 'Publish/consume amb API Kafka. No inclou Schema Registry, ksqlDB ni Control Center.' },
    { label: 'Ús recomanat', value: 'Comparar el camí compatible amb Kafka en escenaris SEA.' },
  ],
  RabbitMQ: [
    ...COMMON_BROKER_REPRODUCIBILITY_ROWS,
    { label: 'Versió', value: 'RabbitMQ 3.13 amb port AMQP 5672.' },
    { label: 'Endpoint', value: 'rabbitmq.brokers.svc.cluster.local:5672.' },
    { label: 'Ús recomanat', value: 'Cues AMQP i casos financers curts, amb cues efímeres per run.' },
    { label: 'Vigila', value: 'Payloads molt grans poden consumir memòria de cua i no són el cas ideal de RabbitMQ.' },
  ],
  'NATS Server': [
    ...COMMON_BROKER_REPRODUCIBILITY_ROWS,
    { label: 'Versió', value: 'NATS Server 2.12.5 amb port 4222.' },
    { label: 'Endpoint', value: 'nats.brokers.svc.cluster.local:4222.' },
    { label: 'Ús recomanat', value: 'Telemetria IoT i pub/sub lleuger amb subject efímer per run.' },
    { label: 'Payload màxim', value: 'Comprova /varz: max_payload ha de ser 4194304 o superior abans de provar missatges grans.' },
  ],
};

const PLATFORM_REPRODUCIBILITY_ALIASES: Record<string, string> = {
  Kafka: 'Apache Kafka',
  'Confluent Platform': 'Confluent',
  NATS: 'NATS Server',
};

const COMPONENT_SNIPPET_ALIASES: Record<string, string> = {
  EDA: 'Event-Driven Architecture',
  QBA: 'Queue-Based Architecture',
  LCA: 'Log-Centric Architecture',
  EMA: 'Event-Mesh Architecture',
  SEA: 'Serverless Event Architecture',
  Kafka: 'Kafka Protocol',
  NATS: 'NATS Protocol',
};

const EDA_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Què comprova', value: 'Un productor publica esdeveniments i un consumidor els rep sense dependre directament del productor.' },
  { label: 'Com es reprodueix', value: 'Usa el mateix broker, protocol i canal del run (topic, cua o subject) amb la mateixa càrrega.' },
  { label: 'Paràmetres a fixar', value: 'Productors, consumidors, payload, ràtio, durada, warm-up i política de confirmació.' },
  { label: 'Com llegir el resultat', value: 'La latència és el temps del missatge complet: productor, broker i consumidor.' },
];

const QBA_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Què comprova', value: 'Missatges en una cua, consumits per un consumidor que confirma la recepció quan el protocol ho permet.' },
  { label: 'Com es reprodueix', value: 'Crea una cua efímera per run, mantén 1 consumidor actiu i declara si hi ha ACK.' },
  { label: 'Paràmetres a fixar', value: 'Prefetch, ACK, nom de cua, payload, ràtio, warm-up i durada.' },
  { label: 'Com llegir el resultat', value: 'Serveix per veure si la cua absorbeix càrrega sense acumular errors o retard.' },
];

const LCA_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Què comprova', value: 'Missatges escrits en un log ordenat, llegits amb offsets o grups de consum.' },
  { label: 'Com es reprodueix', value: 'Crea un topic nou per run o un group-id efímer per evitar offsets antics.' },
  { label: 'Paràmetres a fixar', value: 'Particions, replicació, acks, group-id, retenció, payload, ràtio i durada.' },
  { label: 'Com llegir el resultat', value: 'És la lectura més natural per Kafka: mira throughput, P99 i errors junts.' },
];

const EMA_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Què comprova', value: "Esdeveniments encaminats entre productor, broker o gateway i consumidor." },
  { label: 'Com es reprodueix', value: "Declara plataforma, protocol, gateway si existeix i regla d'encaminament usada." },
  { label: 'Paràmetres a fixar', value: 'Ruta, format de dades, payload, ràtio, política de reintent, warm-up i durada.' },
  { label: 'Com llegir el resultat', value: "Només és comparable si queda clar quin component fa d'encaminador." },
];

const SEA_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Què representa', value: "Serverless Event Architecture: una font genera un esdeveniment, un disparador invoca una funció i la plataforma escala sota demanda." },
  { label: 'Com es portaria a producció', value: "Declara event source, trigger, runtime de funció, timeout, memòria i límit de concurrència. Sense això no és una SEA completa." },
  { label: 'Com llegir-la aquí', value: "Al portal queda documentada com a patró arquitectònic. Si es vol mesurar de veritat, cal afegir funcions serverless al flux executable." },
];

const KAFKA_PROTOCOL_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Transport', value: 'protocol Kafka sobre el port 9092 del broker compatible' },
  { label: 'Com es reprodueix', value: 'Topic per run, producer amb acks declarats i group-id efímer al consumidor.' },
  { label: 'Compatible amb', value: 'Apache Kafka i endpoints Kafka-compatible del clúster.' },
  { label: 'Paràmetre crític', value: 'Particions, acks i offsets, perquè canvien latència i throughput.' },
];

const AMQP_PROTOCOL_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Transport', value: 'AMQP 0.9.1 sobre el port 5672' },
  { label: 'Com es reprodueix', value: 'Exchange i cua efímers per run, amb ACK del consumidor quan aplica.' },
  { label: 'Compatible amb', value: 'RabbitMQ com a referència principal del portal.' },
  { label: 'Paràmetre crític', value: 'ACK, prefetch i tipus de cua, perquè afecten estabilitat i pèrdua.' },
];

const MQTT_PROTOCOL_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Transport', value: 'MQTT 5.0, orientat a publish/subscribe lleuger' },
  { label: 'Com es reprodueix', value: 'Topic per run, QoS declarat i client-id efímer per execució.' },
  { label: 'Compatible amb', value: 'Brokers MQTT quan estiguin activats al portal.' },
  { label: 'Paràmetre crític', value: 'QoS i mida de payload, especialment en telemetria IoT.' },
];

const GRPC_PROTOCOL_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Transport', value: 'gRPC streaming entre gateway i consumidor quan hi ha gateway compatible' },
  { label: 'Com es reprodueix', value: 'Mateix servei, mateix mètode streaming i mateix esquema de missatge.' },
  { label: 'Compatible amb', value: 'Necessita gateway o adaptador; no tots els brokers el parlen directament.' },
  { label: 'Paràmetre crític', value: 'Serialització, connexió persistent i mida del missatge.' },
];

const WS_PROTOCOL_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Transport', value: "WebSocket cap al consumidor final, normalment a través d'un gateway" },
  { label: 'Com es reprodueix', value: "Mateix endpoint, mateix protocol d'autenticació si existeix i mateix payload." },
  { label: 'Compatible amb', value: 'Brokers amb gateway WebSocket o adaptador propi.' },
  { label: 'Paràmetre crític', value: 'Connexió persistent, backpressure i mida dels missatges enviats al client.' },
];

const NATS_PROTOCOL_ROWS: ReproducibilityRow[] = [
  ...COMMON_DECISION_REPRODUCIBILITY_ROWS,
  { label: 'Transport', value: 'protocol NATS sobre el port 4222' },
  { label: 'Com es reprodueix', value: "Subject per run i comprovació de max_payload abans d'enviar payloads grans." },
  { label: 'Compatible amb', value: 'NATS Server.' },
  { label: 'Paràmetre crític', value: 'max_payload, JetStream si aplica i política de subscripció.' },
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
  'Serverless Event Architecture': SEA_ROWS,
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
      'kubectl get pods -n brokers',
      'kubectl get kafka -n brokers',
      'kubectl get kafkanodepool -n brokers',
      'kubectl logs -n brokers -l strimzi.io/name=kafka-cluster-kafka',
    ].join('\n'),
  },
  Confluent: {
    titol: 'Verificar Confluent pel camí Kafka-compatible',
    codi: [
      'kubectl get pods -n brokers',
      'kubectl get svc -n brokers',
      'kubectl get pod -n brokers -o wide',
      'kubectl describe svc -n brokers <servei-kafka-compatible>',
      'kubectl get pod -n brokers <pod-confluent-o-compatible> -o jsonpath="{.spec.containers[0].image}"',
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
  'Serverless Event Architecture': {
    titol: 'Contracte mínim per reproduir SEA',
    codi: [
      'architecture: SEA',
      'eventSource: <queue | topic | subject | storage event>',
      'trigger: declared rule for the function',
      'functionRuntime: declared runtime and version',
      'timeoutSeconds: fixed value',
      'concurrencyLimit: fixed value',
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

  if (shortName === 'confluent' || componentName === 'confluent platform' || componentName === 'confluent') {
    return 'Kafka-compatible 4.1.1';
  }

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
      { label: 'Reproduïbilitat', value: 'No és un producte desplegat: és una decisió del document Scenario i s’ha de repetir igual quan es compara.' },
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
