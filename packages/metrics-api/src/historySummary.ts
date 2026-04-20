const TERMINAL_RUN_STATUSES = new Set([
  'aborted',
  'cancelled',
  'canceled',
  'completed',
  'error',
  'failed',
  'finished',
  'stopped',
  'succeeded',
  'terminated',
  'timeout',
  'timed_out',
]);

const LIVE_HISTORY_GRACE_MS = 60_000;

type TimestampLike = string | number | Date | null | undefined;

function normalizeRunStatus(status: unknown): string | null {
  if (typeof status !== 'string') {
    return null;
  }

  const normalized = status.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function toTimestamp(value: TimestampLike): number | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function isTerminalRunStatus(status: unknown): boolean {
  const normalized = normalizeRunStatus(status);
  return normalized != null && TERMINAL_RUN_STATUSES.has(normalized);
}

export function shouldIncludeRunInHistory(input: {
  status?: unknown;
  endedAt?: TimestampLike;
  now?: TimestampLike;
}): boolean {
  if (isTerminalRunStatus(input.status)) {
    return true;
  }

  const normalized = normalizeRunStatus(input.status);
  if (normalized != null) {
    return false;
  }

  const endedAt = toTimestamp(input.endedAt);
  if (endedAt == null) {
    return false;
  }

  const now = toTimestamp(input.now) ?? Date.now();
  return now - endedAt >= LIVE_HISTORY_GRACE_MS;
}
