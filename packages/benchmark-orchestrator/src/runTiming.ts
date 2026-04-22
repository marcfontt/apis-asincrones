const UI_INDEFINITE_DURATION_SENTINEL_SECONDS = 3600;

export function isIndefiniteDuration(value: unknown): boolean {
  if (value == null || value === '') {
    return true;
  }

  const duration = Number(value);
  if (!Number.isFinite(duration)) {
    return false;
  }

  return duration === 0 || duration >= UI_INDEFINITE_DURATION_SENTINEL_SECONDS;
}

export function getMonitorMaxAttempts(
  durationSeconds: unknown,
  pollIntervalMs = 10_000,
  graceSeconds = 180,
): number | null {
  if (isIndefiniteDuration(durationSeconds)) {
    return null;
  }

  const duration = Number(durationSeconds);
  if (!Number.isFinite(duration) || duration < 0) {
    return null;
  }

  const totalSeconds = Math.max(duration, 60) + graceSeconds;
  return Math.ceil((totalSeconds * 1000) / pollIntervalMs);
}
