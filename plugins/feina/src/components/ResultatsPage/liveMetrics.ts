const LIVE_MESSAGE_FIELDS = [
  'messages_recv',
  'messagesRecv',
  'messages_recv_stable',
  'messagesRecvStable',
  'count',
] as const;

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const readMetricCounter = (metric: Record<string, unknown>): number | null => {
  for (const field of LIVE_MESSAGE_FIELDS) {
    const value = toFiniteNumber(metric[field]);
    if (value != null) return value;
  }

  return null;
};

export const getLiveMessageCount = (metrics: Array<Record<string, unknown>>): number => {
  for (let index = metrics.length - 1; index >= 0; index -= 1) {
    const count = readMetricCounter(metrics[index]);
    if (count != null) return count;
  }

  return metrics.length;
};
