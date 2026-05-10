export const ALL_ARCHITECTURES = ['EDA', 'QBA', 'LCA', 'EMA', 'SEA'];

export const ALL_PROTOCOLS = ['Kafka', 'AMQP', 'MQTT', 'gRPC', 'WS', 'NATS'];

export const ALL_PLATFORMS = ['Kafka', 'RabbitMQ', 'Confluent', 'NATS Server'];

export const DISABLED_PLATFORMS: string[] = [];

export type CompatibilityStatus = 'supported' | 'requiresConfig' | 'blocked';

export type CompatibilityEntry = {
  architectures: string[];
  protocols: string[];
};

export type CompatibilityDecision = {
  status: CompatibilityStatus;
  labelKey: string;
  reasonKey: string;
};

const SUPPORTED: CompatibilityDecision = {
  status: 'supported',
  labelKey: 'catalog.compatibility.status.supported',
  reasonKey: 'catalog.compatibility.reason.supported',
};

const REQUIRES_CONFIG: CompatibilityDecision = {
  status: 'requiresConfig',
  labelKey: 'catalog.compatibility.status.requiresConfig',
  reasonKey: 'catalog.compatibility.reason.requiresConfig',
};

const BLOCKED: CompatibilityDecision = {
  status: 'blocked',
  labelKey: 'catalog.compatibility.status.blocked',
  reasonKey: 'catalog.compatibility.reason.blocked',
};

/*
 * Aquesta matriu nomes conte el cami que el programa sap executar ara mateix.
 * Si una combinacio necessita un gateway o un adaptador que encara no existeix,
 * no la posem com a compatible. Aixi la UI no promet proves que despres fallen.
 */
export const COMPATIBILITY: Record<string, CompatibilityEntry> = {
  Kafka: {
    architectures: ['EDA', 'LCA', 'SEA'],
    protocols: ['Kafka'],
  },
  RabbitMQ: {
    architectures: ['EDA', 'QBA'],
    protocols: ['AMQP'],
  },
  Confluent: {
    architectures: ['EDA', 'LCA', 'SEA'],
    protocols: ['Kafka'],
  },
  'NATS Server': {
    architectures: ['EDA', 'SEA'],
    protocols: ['NATS'],
  },
};

export const getCompatibleArchitectures = (platform: string) =>
  COMPATIBILITY[platform]?.architectures ?? ALL_ARCHITECTURES;

export const getCompatibleProtocols = (platform: string) =>
  COMPATIBILITY[platform]?.protocols ?? ALL_PROTOCOLS;

export function getCompatibilityDecision(
  platform: string,
  kind: 'architecture' | 'protocol',
  value: string,
): CompatibilityDecision {
  const entry = COMPATIBILITY[platform];
  if (!entry) {
    return BLOCKED;
  }

  const supportedValues = kind === 'architecture' ? entry.architectures : entry.protocols;
  if (supportedValues.includes(value)) {
    return SUPPORTED;
  }

  if (kind === 'protocol' && ['WS', 'gRPC', 'MQTT'].includes(value)) {
    return {
      ...BLOCKED,
      reasonKey: 'catalog.compatibility.reason.gatewayMissing',
    };
  }

  return BLOCKED;
}

export function getDataFormatDecision(platform: string, dataFormat: string): CompatibilityDecision {
  if (dataFormat !== 'video-8k') {
    return SUPPORTED;
  }

  if (platform === 'Kafka' || platform === 'Confluent') {
    return {
      ...SUPPORTED,
      reasonKey: 'catalog.compatibility.reason.kafkaLargePayload',
    };
  }

  if (platform === 'NATS Server') {
    return {
      ...REQUIRES_CONFIG,
      reasonKey: 'catalog.compatibility.reason.natsLargePayload',
    };
  }

  if (platform === 'RabbitMQ') {
    return {
      ...REQUIRES_CONFIG,
      reasonKey: 'catalog.compatibility.reason.rabbitLargePayload',
    };
  }

  return REQUIRES_CONFIG;
}

export function getCompatibilityStatusColor(status: CompatibilityStatus): string {
  if (status === 'supported') return 'var(--success)';
  if (status === 'requiresConfig') return 'var(--warning)';
  return 'var(--error)';
}
