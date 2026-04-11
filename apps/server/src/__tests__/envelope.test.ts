import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION } from '@lod/protocol';
import { EnvelopeTracker } from '../net/envelope.js';

function makeRaw(seq: number): string {
  return JSON.stringify({
    v: PROTOCOL_VERSION,
    seq,
    ts: Date.now(),
    type: 'Move',
    payload: { direction: 'N' },
  });
}

describe('EnvelopeTracker', () => {
  it('accepts a strictly increasing seq', () => {
    const tracker = new EnvelopeTracker();
    expect(tracker.parse(makeRaw(0)).ok).toBe(true);
    expect(tracker.parse(makeRaw(1)).ok).toBe(true);
    expect(tracker.parse(makeRaw(5)).ok).toBe(true);
  });

  it('rejects a duplicate seq', () => {
    const tracker = new EnvelopeTracker();
    tracker.parse(makeRaw(3));
    const result = tracker.parse(makeRaw(3));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('stale_seq');
    }
  });

  it('rejects a stale seq', () => {
    const tracker = new EnvelopeTracker();
    tracker.parse(makeRaw(10));
    const result = tracker.parse(makeRaw(5));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('stale_seq');
    }
  });

  it('rejects invalid JSON', () => {
    const tracker = new EnvelopeTracker();
    const result = tracker.parse('{not json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('invalid_json');
    }
  });

  it('rejects envelopes with the wrong protocol version', () => {
    const tracker = new EnvelopeTracker();
    const raw = JSON.stringify({
      v: PROTOCOL_VERSION + 99,
      seq: 0,
      ts: Date.now(),
      type: 'Move',
      payload: {},
    });
    const result = tracker.parse(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('invalid_envelope');
    }
  });
});
