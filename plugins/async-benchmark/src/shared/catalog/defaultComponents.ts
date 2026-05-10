export type CatalogComponentCategory = 'architecture' | 'protocol' | 'platform';

export type DefaultCatalogComponent = {
  shortName: string;
  name: string;
  category: CatalogComponentCategory;
  description: string;
  version?: string;
  tags?: string[];
  predefined: true;
};

// Catàleg base que coincideix amb el seed del catalog-service.
// Només s'utilitza com a fallback quan l'API no respon amb JSON vàlid.
export const DEFAULT_CATALOG_COMPONENTS: DefaultCatalogComponent[] = [
  {
    shortName: 'EDA',
    name: 'Event-Driven Architecture',
    category: 'architecture',
    description: 'Components que reaccionen a esdeveniments asíncrons publicats per productors desacoblats.',
    tags: ['esdeveniments', 'asíncron', 'desacoblat'],
    predefined: true,
  },
  {
    shortName: 'QBA',
    name: 'Queue-Based Architecture',
    category: 'architecture',
    description: 'Missatges col·locats en cues amb consumidors competidors i confirmació quan el protocol ho permet.',
    tags: ['cua', 'treball', 'fiabilitat'],
    predefined: true,
  },
  {
    shortName: 'LCA',
    name: 'Log-Centric Architecture',
    category: 'architecture',
    description: 'Un log ordenat guarda els missatges i els consumidors avancen per offsets.',
    tags: ['log', 'streaming', 'offset'],
    predefined: true,
  },
  {
    shortName: 'EMA',
    name: 'Event-Mesh Architecture',
    category: 'architecture',
    description: 'Malla d’encaminament d’esdeveniments entre productors, brokers, gateways i consumidors.',
    tags: ['mesh', 'encaminament', 'multi-broker'],
    predefined: true,
  },
  {
    shortName: 'SEA',
    name: 'Streaming Events Architecture',
    category: 'architecture',
    description: 'Flux continu d’esdeveniments orientat a streaming, finestres i processament sostingut.',
    tags: ['streaming', 'finestres', 'alt-volum'],
    predefined: true,
  },
  {
    shortName: 'Kafka',
    name: 'Kafka Protocol',
    category: 'protocol',
    version: '4.1.1',
    description: 'Protocol Kafka amb topics, particions, offsets, group-id i ACKs configurables.',
    tags: ['binary', 'partitioned', 'pull'],
    predefined: true,
  },
  {
    shortName: 'AMQP',
    name: 'AMQP 0-9-1',
    category: 'protocol',
    version: '0.9.1',
    description: 'Protocol de cues amb exchange, queue, binding i confirmacions. És la base natural de RabbitMQ.',
    tags: ['queue', 'exchange', 'push'],
    predefined: true,
  },
  {
    shortName: 'MQTT',
    name: 'MQTT 5.0',
    category: 'protocol',
    version: '5.0',
    description: 'Protocol pub/sub lleuger per IoT, amb QoS i topics pensats per missatges petits i freqüents.',
    tags: ['iot', 'pub-sub', 'push'],
    predefined: true,
  },
  {
    shortName: 'NATS',
    name: 'NATS Protocol',
    category: 'protocol',
    version: '2.12.5',
    description: 'Protocol NATS basat en subjects, baixa latència i preflight de max_payload per payloads grans.',
    tags: ['subjects', 'low-latency', 'push'],
    predefined: true,
  },
  {
    shortName: 'gRPC',
    name: 'gRPC',
    category: 'protocol',
    version: '1.64',
    description: 'RPC binari sobre HTTP/2 amb streaming i contracte fort de missatges.',
    tags: ['rpc', 'http2', 'binary'],
    predefined: true,
  },
  {
    shortName: 'WS',
    name: 'WebSocket',
    category: 'protocol',
    version: '13',
    description: 'Canal full-duplex sobre connexió persistent, útil per dashboards i consumidors web.',
    tags: ['full-duplex', 'browser', 'push'],
    predefined: true,
  },
  {
    shortName: 'Kafka',
    name: 'Apache Kafka',
    category: 'platform',
    version: '4.1.1',
    description: 'Broker orientat a logs immutables, topics particionats i consum per offsets.',
    tags: ['distributed-log', 'partitions', 'durable'],
    predefined: true,
  },
  {
    shortName: 'Confluent',
    name: 'Confluent Platform',
    category: 'platform',
    version: '7.6',
    description: 'Plataforma Kafka-compatible usada per comparar el mateix model amb una distribució diferent.',
    tags: ['kafka-compatible', 'schema-registry', 'enterprise'],
    predefined: true,
  },
  {
    shortName: 'RabbitMQ',
    name: 'RabbitMQ',
    category: 'platform',
    version: '3.13',
    description: 'Broker AMQP amb fortalesa en cues, ACKs, routing flexible i plugins de protocol.',
    tags: ['amqp', 'mqtt', 'flexible-routing'],
    predefined: true,
  },
  {
    shortName: 'NATS Server',
    name: 'NATS Server',
    category: 'platform',
    version: '2.12.5',
    description: 'Servidor NATS lleuger amb pub/sub de baixa latència i JetStream quan cal persistència.',
    tags: ['lightweight', 'low-latency', 'jetstream'],
    predefined: true,
  },
];
