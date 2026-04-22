type KafkaPartitionMetadata = {
  leader?: number;
  leaderId?: number;
  partitionErrorCode?: number;
};

type KafkaTopicMetadata = {
  name?: string;
  topic?: string;
  topicErrorCode?: number;
  partitions?: KafkaPartitionMetadata[];
};

type KafkaMetadataResponse = {
  topics?: KafkaTopicMetadata[];
};

type RetryOptions = {
  retries?: number;
  delayMs?: number;
  stepName?: string;
};

const RECOVERABLE_KAFKA_STARTUP_MESSAGES = [
  'This server does not host this topic-partition',
  'LEADER_NOT_AVAILABLE',
  'UNKNOWN_TOPIC_OR_PARTITION',
  'There is no leader for this topic-partition',
  'The group coordinator is not available',
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function hasStableLeader(topicMetadata?: KafkaTopicMetadata): boolean {
  if (!topicMetadata) return false;
  if (topicMetadata.topicErrorCode && topicMetadata.topicErrorCode !== 0) return false;
  if (!topicMetadata.partitions?.length) return false;

  return topicMetadata.partitions.every(partition => {
    const leader = partition.leader ?? partition.leaderId ?? -1;
    const errorCode = partition.partitionErrorCode ?? 0;
    return leader >= 0 && errorCode === 0;
  });
}

export function isRecoverableKafkaStartupError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return RECOVERABLE_KAFKA_STARTUP_MESSAGES.some(pattern => message.includes(pattern));
}

export async function retryKafkaStartupStep<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const retries = options.retries ?? 4;
  const delayMs = options.delayMs ?? 500;
  const stepName = options.stepName || 'Kafka startup';

  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRecoverableKafkaStartupError(error) || attempt === retries) {
        throw error;
      }

      console.warn(
        `[kafka-init] ${stepName} retry ${attempt}/${retries - 1}: ${error instanceof Error ? error.message : String(error)}`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`${stepName} failed after ${retries} attempts`);
}

export async function waitForKafkaTopicReady(
  fetchMetadata: () => Promise<KafkaMetadataResponse>,
  options: { topic: string; retries?: number; delayMs?: number },
): Promise<void> {
  const retries = options.retries ?? 8;
  const delayMs = options.delayMs ?? 250;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const metadata = await fetchMetadata();
      const topicMetadata = metadata.topics?.find(
        topic => topic.name === options.topic || topic.topic === options.topic,
      );

      if (hasStableLeader(topicMetadata)) {
        return;
      }
    } catch (error) {
      if (!isRecoverableKafkaStartupError(error)) {
        throw error;
      }
    }

    if (attempt < retries) {
      await sleep(delayMs);
    }
  }

  throw new Error(`Kafka topic ${options.topic} did not stabilize after ${retries} attempts`);
}
