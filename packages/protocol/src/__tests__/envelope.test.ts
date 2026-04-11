import { describe, it, expect } from 'vitest';
import { envelopeSchema, makeEnvelope } from '../envelope';
import { PROTOCOL_VERSION } from '../version';

describe('envelope', () => {
  it('makeEnvelope() produces a schema-valid envelope', () => {
    const env = makeEnvelope('Move', { direction: 'N' }, 1);
    const parsed = envelopeSchema.safeParse(env);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.v).toBe(PROTOCOL_VERSION);
      expect(parsed.data.seq).toBe(1);
      expect(parsed.data.type).toBe('Move');
    }
  });

  it('round-trips through JSON.stringify/parse', () => {
    const env = makeEnvelope('Chat', { channel: 'global', body: 'hi' }, 7);
    const wire = JSON.stringify(env);
    const parsed = envelopeSchema.safeParse(JSON.parse(wire));
    expect(parsed.success).toBe(true);
  });

  it('rejects envelopes with the wrong protocol version', () => {
    const bad = {
      v: PROTOCOL_VERSION + 1,
      seq: 0,
      ts: Date.now(),
      type: 'Move',
      payload: {},
    };
    expect(envelopeSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects envelopes missing required fields', () => {
    const bad = { v: PROTOCOL_VERSION, seq: 0, type: 'Move', payload: {} };
    expect(envelopeSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects negative seq numbers', () => {
    const bad = {
      v: PROTOCOL_VERSION,
      seq: -1,
      ts: Date.now(),
      type: 'Move',
      payload: {},
    };
    expect(envelopeSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects non-integer seq', () => {
    const bad = {
      v: PROTOCOL_VERSION,
      seq: 1.5,
      ts: Date.now(),
      type: 'Move',
      payload: {},
    };
    expect(envelopeSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts an empty object as payload (inner schemas do the real check)', () => {
    const env = {
      v: PROTOCOL_VERSION,
      seq: 0,
      ts: 0,
      type: 'Flee',
      payload: {},
    };
    expect(envelopeSchema.safeParse(env).success).toBe(true);
  });
});
