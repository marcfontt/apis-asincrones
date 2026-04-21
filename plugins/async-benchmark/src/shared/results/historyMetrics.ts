type HistoryMetricRecord = Record<string, any>;

const toFiniteCount = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const getRunMeasureCount = (item: HistoryMetricRecord): number =>
  toFiniteCount(item.pointCount ?? item.measureCount ?? item.metricPoints);

export const getRunMessageCount = (item: HistoryMetricRecord): number =>
  toFiniteCount(item.messagesRecv ?? item.count ?? item.messages_recv);

export const getScenarioMeasureCount = (item: HistoryMetricRecord): number =>
  toFiniteCount(item.totalMeasures ?? item.measureCount ?? item.pointCount ?? item.count);

export const aggregateScenarioHistory = (items: HistoryMetricRecord[]): HistoryMetricRecord[] => {
  const groups = new Map<string, {
    latest: HistoryMetricRecord;
    latestTs: number;
    runCount: number;
    totalMeasures: number;
    latencySum: number;
    latencyWeight: number;
    throughputSum: number;
    throughputWeight: number;
    errorSum: number;
    errorWeight: number;
  }>();

  items.forEach(item => {
    const scenarioId = typeof item.scenarioId === 'string' ? item.scenarioId : '';
    if (!scenarioId) return;

    const measureCount = getRunMeasureCount(item);
    const messageCount = getRunMessageCount(item);
    const sentCount = toFiniteCount(item.messagesSent ?? item.messages_sent ?? messageCount);
    const metricWeight = Math.max(messageCount, 1);
    const errorWeight = Math.max(sentCount, 1);
    const ts = Date.parse(String(item.endedAt ?? item.startedAt ?? '')) || 0;

    if (!groups.has(scenarioId)) {
      groups.set(scenarioId, {
        latest: item,
        latestTs: ts,
        runCount: 0,
        totalMeasures: 0,
        latencySum: 0,
        latencyWeight: 0,
        throughputSum: 0,
        throughputWeight: 0,
        errorSum: 0,
        errorWeight: 0,
      });
    }

    const group = groups.get(scenarioId)!;
    group.runCount += 1;
    group.totalMeasures += measureCount;

    const avgLatency = Number(item.avgLatency);
    if (Number.isFinite(avgLatency)) {
      group.latencySum += avgLatency * metricWeight;
      group.latencyWeight += metricWeight;
    }

    const avgThroughput = Number(item.avgThroughput);
    if (Number.isFinite(avgThroughput)) {
      group.throughputSum += avgThroughput * metricWeight;
      group.throughputWeight += metricWeight;
    }

    const avgErrorRate = Number(item.avgErrorRate);
    if (Number.isFinite(avgErrorRate)) {
      group.errorSum += avgErrorRate * errorWeight;
      group.errorWeight += errorWeight;
    }

    if (ts >= group.latestTs) {
      group.latest = item;
      group.latestTs = ts;
    }
  });

  return Array.from(groups.entries()).map(([scenarioId, group]) => {
    const latest = group.latest;
    return {
      ...latest,
      runId: latest.runId,
      scenarioId,
      count: group.totalMeasures,
      totalMeasures: group.totalMeasures,
      runCount: group.runCount,
      avgLatency: group.latencyWeight > 0 ? group.latencySum / group.latencyWeight : latest.avgLatency,
      avgThroughput: group.throughputWeight > 0 ? group.throughputSum / group.throughputWeight : latest.avgThroughput,
      avgErrorRate: group.errorWeight > 0 ? group.errorSum / group.errorWeight : latest.avgErrorRate,
      latestRunId: latest.runId,
      latestStartedAt: latest.startedAt,
      latestEndedAt: latest.endedAt,
    };
  });
};
