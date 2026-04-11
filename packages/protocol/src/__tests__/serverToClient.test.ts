import { describe, it, expect } from 'vitest';
import { serverToClientMessageSchema } from '../serverToClient';

const parse = (v: unknown) => serverToClientMessageSchema.safeParse(v);

describe('ServerToClientMessage', () => {
  it('parses a StateSnapshot', () => {
    const msg = {
      type: 'StateSnapshot',
      payload: {
        sectorId: 's-01',
        tileMapId: 'map-01',
        character: {
          id: 'c1',
          position: { x: 10, y: 20 },
          hp: 50,
          hpMax: 100,
          str: 12,
          dex: 11,
          agl: 10,
          credits: 500,
          turnsRemaining: 25,
        },
        inventory: { slots: 40, used: 5, items: [] },
        nearbyEntities: [],
      },
    };
    const r = parse(msg);
    expect(r.success).toBe(true);
  });

  it('parses a StateDelta', () => {
    const msg = {
      type: 'StateDelta',
      payload: {
        movedEntities: [{ id: 'e1', x: 5, y: 5 }],
        hpChanges: [{ entityId: 'e2', hp: 30 }],
        spawns: [],
        despawns: ['e3'],
      },
    };
    expect(parse(msg).success).toBe(true);
  });

  it('parses a CombatEvent for each kind', () => {
    const kinds = [
      { kind: 'hit', actorId: 'a', targetId: 'b' },
      { kind: 'miss', actorId: 'a', targetId: 'b' },
      { kind: 'crit', actorId: 'a', targetId: 'b', amount: 42 },
      { kind: 'damage', actorId: 'a', targetId: 'b', amount: 10 },
      { kind: 'heal', actorId: 'a', amount: 5 },
      { kind: 'flee-success', actorId: 'a' },
      { kind: 'flee-fail', actorId: 'a' },
      { kind: 'defeat', actorId: 'a' },
      { kind: 'victory', actorId: 'a' },
      { kind: 'phase-transition', phase: 'close', actorId: 'a' },
    ];
    for (const k of kinds) {
      const msg = { type: 'CombatEvent', payload: k };
      const r = parse(msg);
      expect(r.success, `failed for kind=${k.kind}`).toBe(true);
    }
  });

  it('rejects a CombatEvent with an unknown kind', () => {
    const msg = { type: 'CombatEvent', payload: { kind: 'nope', actorId: 'a' } };
    expect(parse(msg).success).toBe(false);
  });

  it('parses PresenceUpdate', () => {
    expect(
      parse({
        type: 'PresenceUpdate',
        payload: { entered: ['c2'], left: ['c3'] },
      }).success,
    ).toBe(true);
  });

  it('parses ChatMessage', () => {
    expect(
      parse({
        type: 'ChatMessage',
        payload: { channel: 'global', from: 'c1', body: 'hi', ts: 123 },
      }).success,
    ).toBe(true);
  });

  it('parses MailDelivered and BulletinPosted', () => {
    expect(
      parse({
        type: 'MailDelivered',
        payload: { mailId: 'm1', from: 'c2', subject: 'yo' },
      }).success,
    ).toBe(true);
    expect(
      parse({
        type: 'BulletinPosted',
        payload: { bulletinId: 'b1', author: 'c2', title: 'news' },
      }).success,
    ).toBe(true);
  });

  it('parses Error with a code and message', () => {
    expect(
      parse({
        type: 'Error',
        payload: { code: 'E_AUTHZ', message: 'not allowed' },
      }).success,
    ).toBe(true);
  });

  it('rejects an unknown server message type', () => {
    expect(parse({ type: 'Banana', payload: {} }).success).toBe(false);
  });

  it('rejects a StateSnapshot missing character fields', () => {
    expect(
      parse({
        type: 'StateSnapshot',
        payload: { sectorId: 's', tileMapId: 'm' },
      }).success,
    ).toBe(false);
  });
});
