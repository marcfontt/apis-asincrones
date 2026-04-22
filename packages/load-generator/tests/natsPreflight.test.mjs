import test from 'node:test';
import assert from 'node:assert/strict';

let natsPreflight;

test.before(async () => {
  natsPreflight = await import('../dist/natsPreflight.js');
});

test('returns an explanatory error when the configured NATS payload exceeds the server limit', () => {
  const message = natsPreflight.getNatsPayloadPreflightError(2_000_000, {
    max_payload: 1_048_576,
  });

  assert.match(message, /max_payload/i);
  assert.match(message, /2000000/);
  assert.match(message, /1048576/);
});

test('returns null when the configured payload fits inside the NATS server limit', () => {
  const message = natsPreflight.getNatsPayloadPreflightError(500_000, {
    max_payload: 4_194_304,
  });

  assert.equal(message, null);
});
