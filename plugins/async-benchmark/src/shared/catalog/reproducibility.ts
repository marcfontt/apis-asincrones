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
  kafka: '4.1.1',
  confluent: '7.6',
  rabbitmq: '3.13',
  'nats server': '2.12.5',
  nats: '2.12.5',
  emqx: '5.6',
  activemq: '6.1',
  mqtt: '5.0',
  amqp: '1.0',
  websocket: '13',
  ws: '13',
  grpc: '1.64',
  'http/2': '2.0',
  'nats protocol': '2.12.5',
  'kafka protocol': '4.1.1',
};

const COMMON_BROKER_REPRODUCIBILITY_ROWS: ReproducibilityRow[] = [
  { label: 'Criteri igualador', value: '1 broker actiu per prova, 1 productor i 1 consumidor per run' },
  { label: 'Generador de carrega', value: 'mateix load-generator per totes les plataformes comparades' },
  { label: 'Warmup i durada', value: 'mateixos valors definits a l escenari abans de l execucio' },
  { label: 'Payload', value: 'definit pel format de dades i visible abans de llancar el run' },
  { label: 'Persistencia', value: 'retencio curta o emmagatzematge efimer per evitar contaminacio entre runs' },
  { label: 'Recursos objectiu', value: 'requests i limits iguals quan el manifest es nostre' },
];

export const REPRODUCIBILITY_BY_PLATFORM: Record<string, ReproducibilityRow[]> = {
  'Apache Kafka': [
    ...COMMON_BROKER_REPRODUCIBILITY_ROWS,
    { label: 'Producte', value: 'Apache Kafka' },
    { label: 'Versio usada', value: '4.1.1' },
    { label: 'Operador/chart', value: 'Strimzi amb KRaft i node pool dual-role' },
    { label: 'Namespace', value: 'kafka-strimzi' },
    { label: 'Port client', value: '9092 dins del cluster' },
    { label: 'Topologia', value: '1 replica amb rol controller + broker' },
    { label: 'Particions', value: '1 particio per topic de run' },
    { label: 'Replicacio', value: 'factor 1 per mantenir cost comparable amb la resta' },
    { label: 'Video8K', value: 'compatible quan el payload final es acceptat pel productor i topic del run' },
  ],
  'Confluent Platform': [
    ...COMMON_BROKER_REPRODUCIBILITY_ROWS,
    { label: 'Producte', value: 'Redpanda amb API Kafka compatible per representar Confluent/Kafka compatible' },
    { label: 'Versio usada', value: '7.6 a la fitxa de compatibilitat del projecte' },
    { label: 'Instal.lacio', value: 'Helm chart redpanda/redpanda' },
    { label: 'Namespace', value: 'brokers' },
    { label: 'Port client', value: '9092 dins del cluster' },
    { label: 'Topologia', value: 'single-node' },
    { label: 'Video8K', value: 'compatible si el run usa el mateix payload definit pel format' },
  ],
  RabbitMQ: [
    ...COMMON_BROKER_REPRODUCIBILITY_ROWS,
    { label: 'Producte', value: 'RabbitMQ Management' },
    { label: 'Versio usada', value: '3.13' },
    { label: 'Imatge/chart', value: 'rabbitmq:3.13-management o Bitnami RabbitMQ equivalent' },
    { label: 'Namespace', value: 'brokers' },
    { label: 'Port client', value: '5672' },
    { label: 'Port monitoratge', value: '15672' },
    { label: 'Cues', value: 'classic queues efimeres per run' },
    { label: 'Video8K', value: 'compatible si la cua accepta el payload i el consumidor confirma correctament' },
  ],
  'NATS Server': [
    ...COMMON_BROKER_REPRODUCIBILITY_ROWS,
    { label: 'Producte', value: 'NATS Server' },
    { label: 'Versio usada', value: '2.12.5 segons logs del pod nats-0' },
    { label: 'Instal.lacio', value: 'Helm chart oficial nats/nats' },
    { label: 'Namespace', value: 'brokers' },
    { label: 'Port client', value: '4222' },
    { label: 'Port monitoratge', value: '8222 via svc/nats-headless' },
    { label: 'Topologia', value: 'single-node + JetStream quan el chart el desplega' },
    { label: 'Payload maxim', value: '4 MB / 4194304 bytes' },
    { label: 'Video8K', value: 'compatible nomes si /varz mostra "max_payload": 4194304' },
  ],
};

export const REPRODUCIBILITY_BY_COMPONENT_NAME: Record<string, ReproducibilityRow[]> = {
  'Event-Driven Architecture': [
    { label: 'Implementacio', value: 'topic, cua o subject per scenarioId amb productor desacoblat' },
    { label: 'Comparacio justa', value: 'mateix format, rate, warmup i durada que la resta d arquitectures' },
  ],
  'Queue-Based Architecture': [
    { label: 'Implementacio', value: 'cua amb lliurament a consumidor i ACK quan el protocol ho permet' },
    { label: 'Comparacio justa', value: '1 productor i 1 consumidor per run' },
  ],
  'Log-Centric Architecture': [
    { label: 'Implementacio', value: 'log particionat amb offsets o group-id efimer per run' },
    { label: 'Comparacio justa', value: 'topic nou o net per evitar heretar estat antic' },
  ],
  Kafka: [
    { label: 'Implementacio', value: 'topic per run i group-id efimer per no heretar offsets antics' },
    { label: 'Diferencia inevitable', value: 'model pull amb offsets; no es equivalent als ACKs de NATS o RabbitMQ' },
  ],
  AMQP: [
    { label: 'Implementacio', value: 'cua RabbitMQ efimera amb confirmacio del consumidor quan aplica' },
    { label: 'Diferencia inevitable', value: 'model de cues i ACKs propi d AMQP' },
  ],
  MQTT: [
    { label: 'Implementacio', value: 'publish/subscribe per topic amb payload petit o IoT' },
    { label: 'Cas d us', value: 'telemetria d alta frequencia i missatges petits' },
  ],
  gRPC: [
    { label: 'Implementacio', value: 'streaming cap al consumidor quan hi ha gateway compatible' },
    { label: 'Cas d us', value: 'integracio fortament tipada i baixa latencia' },
  ],
  WS: [
    { label: 'Implementacio', value: 'canal WebSocket cap al consumidor per fluxos en temps real' },
    { label: 'Cas d us', value: 'consumidors web o dashboards que necessiten dades push' },
  ],
  NATS: [
    { label: 'Implementacio', value: 'subject NATS per run amb preflight de max_payload abans d enviar' },
    { label: 'Limit Video8K', value: 'max_payload del broker ha de ser com a minim 4 MB' },
  ],
};

export const REPRODUCIBILITY_SNIPPETS: Record<string, ReproducibilitySnippet> = {
  'Apache Kafka': {
    titol: 'Desplegar Kafka via Strimzi al cluster',
    codi: [
      'kubectl create namespace kafka-strimzi',
      "kubectl create -f 'https://strimzi.io/install/latest?namespace=kafka-strimzi' -n kafka-strimzi",
      'kubectl apply -f k8s/kafka/kafkanodepool.yaml -n kafka-strimzi',
      'kubectl apply -f k8s/kafka/kafka-cluster.yaml -n kafka-strimzi',
    ].join('\n'),
  },
  'Confluent Platform': {
    titol: 'Desplegar Redpanda amb API Kafka compatible',
    codi: [
      'helm repo add redpanda https://charts.redpanda.com/',
      'helm repo update',
      'helm install redpanda redpanda/redpanda -n brokers --create-namespace \\',
      '  --set storage.persistentVolume.size=5Gi',
    ].join('\n'),
  },
  RabbitMQ: {
    titol: 'Desplegar RabbitMQ amb credencials controlades',
    codi: [
      'helm repo add bitnami https://charts.bitnami.com/bitnami',
      'helm repo update',
      'helm install rabbitmq bitnami/rabbitmq -n brokers --create-namespace \\',
      '  --set auth.username=admin \\',
      '  --set auth.password=BenchmarkAdmin2024',
    ].join('\n'),
  },
  'NATS Server': {
    titol: 'Desplegar NATS amb max_payload=4MB per Video8K',
    codi: [
      'helm repo add nats https://nats-io.github.io/k8s/helm/charts/',
      'helm repo update',
      'helm upgrade nats nats/nats -n brokers --reuse-values \\',
      "  --set-string config.merge.max_payload='<< 4MB >>'",
      '',
      '# Verificacio del valor anunciat pel servidor:',
      'kubectl port-forward -n brokers svc/nats-headless 8222:8222',
      'curl -s http://127.0.0.1:8222/varz | grep max_payload',
    ].join('\n'),
  },
};

export function getKnownComponentVersion(component: any): string {
  if (component && component.version) {
    return String(component.version);
  }

  const shortName = component && component.shortName ? String(component.shortName).toLowerCase() : '';
  if (shortName && KNOWN_COMPONENT_VERSIONS[shortName]) {
    return KNOWN_COMPONENT_VERSIONS[shortName];
  }

  const componentName = component && component.name ? String(component.name).toLowerCase() : '';
  if (componentName && KNOWN_COMPONENT_VERSIONS[componentName]) {
    return KNOWN_COMPONENT_VERSIONS[componentName];
  }

  return '';
}

export function getReproducibilityRows(component: any): ReproducibilityRow[] | null {
  if (!component) {
    return null;
  }

  const componentName = String(component.name || '');
  const shortName = String(component.shortName || '');
  const explicitRows =
    REPRODUCIBILITY_BY_COMPONENT_NAME[componentName] ||
    REPRODUCIBILITY_BY_COMPONENT_NAME[shortName] ||
    REPRODUCIBILITY_BY_PLATFORM[componentName];

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
      { label: 'Definicio', value: 's aplica dins d un escenari amb plataforma, format, rate i durada concrets' },
      { label: 'Reproductibilitat', value: 'no es un producte desplegat; es una decisio del contracte Scenario' },
    ];
  }

  return null;
}

export function getReproducibilitySnippet(component: any): ReproducibilitySnippet | null {
  if (!component) {
    return null;
  }

  const componentName = String(component.name || '');
  if (REPRODUCIBILITY_SNIPPETS[componentName]) {
    return REPRODUCIBILITY_SNIPPETS[componentName];
  }

  const shortName = String(component.shortName || '');
  if (REPRODUCIBILITY_SNIPPETS[shortName]) {
    return REPRODUCIBILITY_SNIPPETS[shortName];
  }

  return null;
}

export function getReproducibilityStatus(component: any): ReproducibilityStatus {
  if (!component) {
    return 'No aplica';
  }

  if (component.category === 'platform') {
    return 'Completa';
  }

  if (component.category === 'architecture' || component.category === 'protocol') {
    return 'Parcial';
  }

  return 'No aplica';
}
