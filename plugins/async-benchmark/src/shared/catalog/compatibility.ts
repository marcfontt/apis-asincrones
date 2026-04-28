export const ALL_ARCHITECTURES = ['EDA', 'QBA', 'LCA', 'EMA', 'SEA'];

export const ALL_PROTOCOLS = ['Kafka', 'AMQP', 'MQTT', 'gRPC', 'WS', 'NATS'];

export const ALL_PLATFORMS = ['Kafka', 'RabbitMQ', 'Confluent', 'NATS Server'];

export const DISABLED_PLATFORMS: string[] = [];

export type CompatibilityEntry = {
  architectures: string[];
  protocols: string[];
};

export const COMPATIBILITY: Record<string, CompatibilityEntry> = {
  Kafka: {
    architectures: ['EDA', 'SEA', 'QBA'],
    protocols: ['Kafka', 'AMQP', 'gRPC'],
  },
  RabbitMQ: {
    architectures: ['EDA', 'QBA', 'EMA'],
    protocols: ['AMQP', 'MQTT', 'WS'],
  },
  Confluent: {
    architectures: ['EDA', 'SEA', 'QBA'],
    protocols: ['Kafka', 'AMQP', 'gRPC'],
  },
  'NATS Server': {
    architectures: ['EDA', 'LCA', 'SEA'],
    protocols: ['NATS', 'WS', 'gRPC'],
  },
};

export const getCompatibleArchitectures = (platform: string) =>
  COMPATIBILITY[platform]?.architectures ?? ALL_ARCHITECTURES;

export const getCompatibleProtocols = (platform: string) =>
  COMPATIBILITY[platform]?.protocols ?? ALL_PROTOCOLS;
