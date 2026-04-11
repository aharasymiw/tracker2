import { describe, it, expect } from 'vitest';
import { clientToServerMessageSchema } from '../clientToServer';

const parse = (v: unknown) => clientToServerMessageSchema.safeParse(v);

describe('ClientToServerMessage', () => {
  it('parses a Move intent', () => {
    const msg = { type: 'Move', direction: 'NE' };
    const r = parse(msg);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.type).toBe('Move');
      if (r.data.type === 'Move') expect(r.data.direction).toBe('NE');
    }
  });

  it('rejects Move with invalid direction', () => {
    expect(parse({ type: 'Move', direction: 'UP' }).success).toBe(false);
  });

  it('parses an Interact intent', () => {
    const r = parse({ type: 'Interact', targetKind: 'npc', targetId: 'npc-42' });
    expect(r.success).toBe(true);
  });

  it('parses AttackLongRange and AttackClose', () => {
    expect(
      parse({ type: 'AttackLongRange', targetId: 't1', weaponId: 'w1' }).success,
    ).toBe(true);
    expect(
      parse({ type: 'AttackClose', targetId: 't1', weaponId: 'w1' }).success,
    ).toBe(true);
  });

  it('parses UseItem with and without a targetId', () => {
    expect(parse({ type: 'UseItem', itemId: 'i1' }).success).toBe(true);
    expect(
      parse({ type: 'UseItem', itemId: 'i1', targetId: 'c1' }).success,
    ).toBe(true);
  });

  it('parses Flee with no extra fields', () => {
    expect(parse({ type: 'Flee' }).success).toBe(true);
  });

  it('enforces Chat body max length of 500', () => {
    const ok = parse({ type: 'Chat', channel: 'global', body: 'hello' });
    expect(ok.success).toBe(true);
    const bad = parse({ type: 'Chat', channel: 'global', body: 'a'.repeat(501) });
    expect(bad.success).toBe(false);
  });

  it('parses trade messages', () => {
    expect(
      parse({
        type: 'TradeOffer',
        toCharacterId: 'c2',
        itemIds: ['i1', 'i2'],
        credits: 100,
      }).success,
    ).toBe(true);
    expect(parse({ type: 'TradeAccept', tradeId: 't1' }).success).toBe(true);
    expect(parse({ type: 'TradeCancel', tradeId: 't1' }).success).toBe(true);
  });

  it('parses RaidDeclare', () => {
    expect(parse({ type: 'RaidDeclare', fortressId: 'f1' }).success).toBe(true);
  });

  it('parses TrainStat and SellStatPoints', () => {
    expect(parse({ type: 'TrainStat', stat: 'STR', points: 3 }).success).toBe(true);
    expect(
      parse({ type: 'SellStatPoints', stat: 'DEX', points: 1 }).success,
    ).toBe(true);
  });

  it('rejects unknown message types', () => {
    expect(parse({ type: 'Teleport', x: 1, y: 2 }).success).toBe(false);
  });

  it('rejects missing discriminator', () => {
    expect(parse({ direction: 'N' }).success).toBe(false);
  });

  it('rejects non-object inputs', () => {
    expect(parse(null).success).toBe(false);
    expect(parse('Move').success).toBe(false);
    expect(parse(42).success).toBe(false);
  });

  it('rejects negative credits in a trade offer', () => {
    expect(
      parse({
        type: 'TradeOffer',
        toCharacterId: 'c2',
        itemIds: [],
        credits: -1,
      }).success,
    ).toBe(false);
  });

  it('rejects non-positive training points', () => {
    expect(parse({ type: 'TrainStat', stat: 'STR', points: 0 }).success).toBe(false);
    expect(parse({ type: 'TrainStat', stat: 'STR', points: -1 }).success).toBe(false);
  });
});
