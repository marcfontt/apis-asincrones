import { isTerminalRunStatus, shouldIncludeRunInHistory } from '../../metrics-api/src/historySummary';

describe('history summary filtering', () => {
  it('treats completed runs as historical and excludes live snapshots', () => {
    expect(isTerminalRunStatus('completed')).toBe(true);
    expect(isTerminalRunStatus('running')).toBe(false);
    expect(isTerminalRunStatus(undefined)).toBe(false);

    expect(
      shouldIncludeRunInHistory({
        status: 'completed',
        endedAt: '2026-04-20T12:00:00.000Z',
        now: '2026-04-20T12:00:30.000Z',
      }),
    ).toBe(true);
    expect(
      shouldIncludeRunInHistory({
        status: 'running',
        endedAt: '2026-04-20T12:00:00.000Z',
        now: '2026-04-20T12:00:30.000Z',
      }),
    ).toBe(false);
    expect(
      shouldIncludeRunInHistory({
        status: undefined,
        endedAt: '2026-04-20T12:00:00.000Z',
        now: '2026-04-20T12:00:30.000Z',
      }),
    ).toBe(false);
  });

  it('accepts other terminal end states that should stay visible in history', () => {
    expect(isTerminalRunStatus('failed')).toBe(true);
    expect(isTerminalRunStatus('error')).toBe(true);
    expect(isTerminalRunStatus('cancelled')).toBe(true);
    expect(isTerminalRunStatus('aborted')).toBe(true);
  });

  it('keeps legacy runs without status only when they are clearly stale', () => {
    expect(
      shouldIncludeRunInHistory({
        status: undefined,
        endedAt: '2026-04-20T12:00:00.000Z',
        now: '2026-04-20T12:01:30.000Z',
      }),
    ).toBe(true);
  });
});
