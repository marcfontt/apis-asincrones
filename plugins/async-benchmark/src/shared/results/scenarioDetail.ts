import {
  getRunMeasureCount,
  getRunMessageCount,
  getRunSentCount,
  getScenarioMeasureCount,
  getScenarioMessageCount,
  getScenarioSentCount,
} from './historyMetrics';

type ScenarioRecord = Record<string, any>;

const toTimestamp = (value: unknown) => Date.parse(String(value || '')) || 0;

export const buildScenarioHistoryDetail = (
  aggregate: ScenarioRecord,
  rawRuns: ScenarioRecord[],
  scenarioName: string,
) => {
  const orderedRuns = [...rawRuns].sort((a, b) => {
    const aTs = toTimestamp(a.endedAt ?? a.startedAt);
    const bTs = toTimestamp(b.endedAt ?? b.startedAt);
    return bTs - aTs;
  });

  const latestRun = orderedRuns[0] ?? null;
  const oldestRun = orderedRuns[orderedRuns.length - 1] ?? null;

  const totalMeasures =
    getScenarioMeasureCount(aggregate) ||
    orderedRuns.reduce((sum, run) => sum + getRunMeasureCount(run), 0);

  const totalMessagesReceived =
    getScenarioMessageCount(aggregate) ||
    orderedRuns.reduce((sum, run) => sum + getRunMessageCount(run), 0);

  const totalMessagesSent =
    getScenarioSentCount(aggregate) ||
    orderedRuns.reduce((sum, run) => sum + getRunSentCount(run), 0);

  return {
    scenarioId: aggregate.scenarioId,
    scenarioName,
    runCount: aggregate.runCount ?? orderedRuns.length,
    totalMeasures,
    totalMessagesReceived,
    totalMessagesSent,
    avgLatency: aggregate.avgLatency ?? null,
    avgThroughput: aggregate.avgThroughput ?? null,
    avgErrorRate: aggregate.avgErrorRate ?? null,
    architecture: aggregate.architecture ?? latestRun?.architecture ?? '',
    protocol: aggregate.protocol ?? latestRun?.protocol ?? '',
    platform: aggregate.platform ?? aggregate.broker ?? latestRun?.platform ?? latestRun?.broker ?? '',
    dataFormat: aggregate.dataFormat ?? latestRun?.dataFormat ?? 'default',
    latestRunId: aggregate.latestRunId ?? latestRun?.runId ?? latestRun?.id ?? '',
    firstStartedAt: oldestRun?.startedAt ?? aggregate.firstStartedAt ?? '',
    latestStartedAt: aggregate.latestStartedAt ?? latestRun?.startedAt ?? '',
    latestEndedAt: aggregate.latestEndedAt ?? latestRun?.endedAt ?? latestRun?.completedAt ?? '',
    latestRun,
    runs: orderedRuns,
  };
};
