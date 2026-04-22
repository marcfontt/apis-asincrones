import test from 'node:test';
import assert from 'node:assert/strict';

let kafkaInit;

test.before(async () => {
  kafkaInit = await import('../dist/kafkaInit.js');
});

test('retries transient Kafka topic-partition metadata errors until startup succeeds', async () => {
  let attempts = 0;

  const result = await kafkaInit.retryKafkaStartupStep(
    async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('This server does not host this topic-partition');
      }

      return 'ready';
    },
    { retries: 3, delayMs: 0, stepName: 'consumer subscribe' },
  );

  assert.equal(result, 'ready');
  assert.equal(attempts, 2);
});

test('waits until Kafka topic metadata reports a stable leader', async () => {
  let calls = 0;

  await kafkaInit.waitForKafkaTopicReady(
    async () => {
      calls += 1;

      if (calls === 1) {
        return {
          topics: [{
            name: 'benchmark-run-1',
            partitions: [{ partitionId: 0, leader: -1, partitionErrorCode: 5 }],
          }],
        };
      }

      return {
        topics: [{
          name: 'benchmark-run-1',
          partitions: [{ partitionId: 0, leader: 0, partitionErrorCode: 0 }],
        }],
      };
    },
    { topic: 'benchmark-run-1', retries: 3, delayMs: 0 },
  );

  assert.equal(calls, 2);
});
