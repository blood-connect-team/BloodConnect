import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveNeededBy } from './neededBy.js';

const now = new Date('2026-01-10T10:00:00Z');

describe('resolveNeededBy', () => {
  it('treats an empty value as no deadline', () => {
    assert.deepEqual(resolveNeededBy('', now), { neededBy: null, expiresAt: null });
  });

  it('rejects past and invalid values', () => {
    assert.ok(resolveNeededBy('2026-01-10T09:00:00Z', now).error);
    assert.ok(resolveNeededBy('2026-01-10T10:00:00Z', now).error);
    assert.ok(resolveNeededBy('not a date', now).error);
  });

  it('uses an earlier deadline as the expiry', () => {
    assert.deepEqual(resolveNeededBy('2026-01-11T10:00:00Z', now), {
      neededBy: '2026-01-11T10:00:00.000Z',
      expiresAt: '2026-01-11T10:00:00.000Z',
    });
  });

  it('keeps the default 48 hour expiry for later deadlines', () => {
    assert.deepEqual(resolveNeededBy('2026-01-14T10:00:00Z', now), {
      neededBy: '2026-01-14T10:00:00.000Z',
      expiresAt: null,
    });
    assert.equal(resolveNeededBy('2026-01-12T10:00:00Z', now).expiresAt, null);
  });
});
