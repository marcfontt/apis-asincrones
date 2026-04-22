import test from 'node:test';
import assert from 'node:assert/strict';

let runTiming;

test.before(async () => {
  runTiming = await import('../dist/runTiming.js');
});

test('treats the UI indefinite sentinel as an indefinite run duration', () => {
  assert.equal(runTiming.isIndefiniteDuration(null), true);
  assert.equal(runTiming.isIndefiniteDuration(0), true);
  assert.equal(runTiming.isIndefiniteDuration(3600), true);
  assert.equal(runTiming.isIndefiniteDuration(120), false);
});

test('does not apply a finite watchdog to indefinite runs', () => {
  assert.equal(runTiming.getMonitorMaxAttempts(null), null);
  assert.equal(runTiming.getMonitorMaxAttempts(3600), null);
});

test('extends the monitor window beyond the real finite run duration', () => {
  const attempts = runTiming.getMonitorMaxAttempts(1800, 10_000, 180);

  assert.equal(attempts, 198);
});
