import {
  aggregateScenarioHistory,
  getRunMeasureCount,
  getScenarioMeasureCount,
} from '@internal/plugin-async-benchmark/src/shared/results/historyMetrics';

describe('historyMetrics helpers', () => {
  it('reads telemetry point counts without falling back to message counters', () => {
    expect(getRunMeasureCount({ pointCount: 18, messagesRecv: 900 })).toBe(18);
    expect(getRunMeasureCount({ measureCount: 9, count: 500 })).toBe(9);
    expect(getRunMeasureCount({ messagesRecv: 42 })).toBe(0);
  });

  it('aggregates measures per scenario while keeping latency weighting by messages', () => {
    const aggregated = aggregateScenarioHistory([
      {
        runId: 'run-a',
        scenarioId: 'scenario-1',
        pointCount: 10,
        messagesRecv: 100,
        messagesSent: 100,
        avgLatency: 1,
        avgThroughput: 50,
        avgErrorRate: 0,
        endedAt: '2026-04-20T10:00:00.000Z',
      },
      {
        runId: 'run-b',
        scenarioId: 'scenario-1',
        pointCount: 25,
        messagesRecv: 300,
        messagesSent: 300,
        avgLatency: 3,
        avgThroughput: 75,
        avgErrorRate: 0,
        endedAt: '2026-04-20T11:00:00.000Z',
      },
    ]);

    expect(aggregated).toHaveLength(1);
    expect(getScenarioMeasureCount(aggregated[0])).toBe(35);
    expect(aggregated[0].runCount).toBe(2);
    expect(aggregated[0].avgLatency).toBeCloseTo(2.5, 5);
    expect(aggregated[0].avgThroughput).toBeCloseTo(68.75, 5);
    expect(aggregated[0].runId).toBe('run-b');
  });
});
