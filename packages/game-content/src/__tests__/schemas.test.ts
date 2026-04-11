import { describe, expect, it } from 'vitest';

import {
  itemSchema,
  weaponSchema,
  armorSchema,
  enemySchema,
  npcSchema,
  dialogueTreeSchema,
  mapSchema,
} from '../schemas/index.js';

describe('itemSchema', () => {
  it('accepts a minimal valid item', () => {
    const item = itemSchema.parse({
      id: 'foo',
      name: 'Foo',
      description: 'A thing',
      category: 'consumable',
      stackable: true,
      buyPrice: 10,
      sellPrice: 5,
    });
    expect(item.maxStack).toBe(1);
  });

  it('rejects an item missing id', () => {
    expect(() =>
      itemSchema.parse({
        name: 'Foo',
        description: '',
        category: 'consumable',
        stackable: true,
        buyPrice: null,
        sellPrice: null,
      }),
    ).toThrow();
  });

  it('rejects an unknown category', () => {
    expect(() =>
      itemSchema.parse({
        id: 'foo',
        name: 'Foo',
        description: '',
        category: 'nonsense',
        stackable: false,
        buyPrice: null,
        sellPrice: null,
      }),
    ).toThrow();
  });
});

describe('weaponSchema', () => {
  it('accepts a valid long-range weapon', () => {
    const w = weaponSchema.parse({
      id: 'rifle',
      name: 'Rifle',
      description: '',
      kind: 'long',
      base: 10,
      variance: 4,
      accuracy: 0.1,
      optimalRange: 8,
      buyPrice: 100,
      sellPrice: 40,
    });
    expect(w.kind).toBe('long');
  });

  it('rejects base <= 0', () => {
    expect(() =>
      weaponSchema.parse({
        id: 'bad',
        name: 'Bad',
        description: '',
        kind: 'close',
        base: 0,
        variance: 0,
        accuracy: 0,
        buyPrice: null,
        sellPrice: null,
      }),
    ).toThrow();
  });

  it('rejects accuracy outside [-0.5, 0.5]', () => {
    expect(() =>
      weaponSchema.parse({
        id: 'bad',
        name: 'Bad',
        description: '',
        kind: 'close',
        base: 1,
        variance: 0,
        accuracy: 0.9,
        buyPrice: null,
        sellPrice: null,
      }),
    ).toThrow();
  });
});

describe('armorSchema', () => {
  it('accepts valid armor', () => {
    expect(() =>
      armorSchema.parse({
        id: 'vest',
        name: 'Vest',
        description: '',
        soak: 3,
        soakLong: 2,
        buyPrice: 50,
        sellPrice: 20,
      }),
    ).not.toThrow();
  });

  it('rejects negative soak', () => {
    expect(() =>
      armorSchema.parse({
        id: 'vest',
        name: 'Vest',
        description: '',
        soak: -1,
        soakLong: 0,
        buyPrice: null,
        sellPrice: null,
      }),
    ).toThrow();
  });
});

describe('enemySchema', () => {
  it('accepts a valid enemy', () => {
    expect(() =>
      enemySchema.parse({
        id: 'e',
        name: 'E',
        description: '',
        tier: 1,
        stats: { str: 1, dex: 1, agl: 1, hpMax: 10 },
        lootTable: [],
        xpReward: 1,
        creditsReward: [1, 2],
      }),
    ).not.toThrow();
  });

  it('rejects tier > 10', () => {
    expect(() =>
      enemySchema.parse({
        id: 'e',
        name: 'E',
        description: '',
        tier: 99,
        stats: { str: 1, dex: 1, agl: 1, hpMax: 10 },
        lootTable: [],
        xpReward: 1,
        creditsReward: [1, 2],
      }),
    ).toThrow();
  });
});

describe('npcSchema', () => {
  it('accepts a valid npc without shopStock', () => {
    expect(() =>
      npcSchema.parse({
        id: 'n',
        name: 'N',
        role: 'flavor',
        dialogueKey: 'hello',
        sectorId: 'sacre_base',
        position: { x: 1, y: 1 },
      }),
    ).not.toThrow();
  });

  it('rejects an unknown role', () => {
    expect(() =>
      npcSchema.parse({
        id: 'n',
        name: 'N',
        role: 'king',
        dialogueKey: 'hello',
        sectorId: 'sacre_base',
        position: { x: 1, y: 1 },
      }),
    ).toThrow();
  });
});

describe('dialogueTreeSchema', () => {
  it('accepts a simple tree with a terminal choice', () => {
    const tree = dialogueTreeSchema.parse({
      start: {
        id: 'start',
        text: 'Hello',
        choices: [{ label: 'Bye', next: null }],
      },
    });
    expect(Object.keys(tree)).toEqual(['start']);
  });

  it('rejects a node missing text', () => {
    expect(() =>
      dialogueTreeSchema.parse({
        start: { id: 'start', choices: [] },
      }),
    ).toThrow();
  });
});

describe('mapSchema', () => {
  it('accepts a 2x2 map with the right number of tiles', () => {
    expect(() =>
      mapSchema.parse({
        id: 'tiny',
        name: 'Tiny',
        width: 2,
        height: 2,
        sectorId: 's',
        tiles: ['floor', 'floor', 'floor', 'wall'],
        spawns: [],
        exits: [],
      }),
    ).not.toThrow();
  });

  it('rejects a map whose tiles length is wrong', () => {
    expect(() =>
      mapSchema.parse({
        id: 'broken',
        name: 'Broken',
        width: 2,
        height: 2,
        sectorId: 's',
        tiles: ['floor', 'floor', 'floor'],
        spawns: [],
        exits: [],
      }),
    ).toThrow();
  });

  it('rejects an unknown tile kind', () => {
    expect(() =>
      mapSchema.parse({
        id: 'weird',
        name: 'Weird',
        width: 1,
        height: 1,
        sectorId: 's',
        tiles: ['lava'],
        spawns: [],
        exits: [],
      }),
    ).toThrow();
  });
});
