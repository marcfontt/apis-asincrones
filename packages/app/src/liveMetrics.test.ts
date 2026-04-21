import { getLiveMessageCount } from '../../../plugins/async-benchmark/src/shared/metrics/liveMetrics';

describe('getLiveMessageCount', () => {
  it('uses the latest cumulative messages_recv value instead of the number of metric snapshots', () => {
    const metrics = [
      { id: 'm1', messages_recv: 5 },
      { id: 'm2', messages_recv: 17 },
      { id: 'm3', messages_recv: 30 },
    ];

    expect(getLiveMessageCount(metrics)).toBe(30);
  });

  it('falls back to camelCase counters and finally to snapshot count for legacy docs', () => {
    expect(getLiveMessageCount([{ messagesRecv: 12 }])).toBe(12);
    expect(getLiveMessageCount([{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }])).toBe(3);
  });
});
