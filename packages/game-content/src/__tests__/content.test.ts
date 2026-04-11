import { describe, expect, it } from 'vitest';

import itemsJson from '../data/items.json';
import weaponsJson from '../data/weapons.json';
import armorJson from '../data/armor.json';
import enemiesJson from '../data/enemies.json';
import npcsJson from '../data/npcs.json';
import dialogueJson from '../data/dialogue.json';
import sacreBaseJson from '../data/maps/sacre-base.json';
import wastelandJson from '../data/maps/wasteland.json';

import { loadContentPack } from '../loader.js';
import {
  itemSchema,
  weaponSchema,
  armorSchema,
  enemySchema,
  npcSchema,
  dialogueTreeSchema,
  mapSchema,
} from '../schemas/index.js';
import { z } from 'zod';

describe('raw JSON parses against its schema', () => {
  it('items.json', () => {
    expect(() => z.array(itemSchema).parse(itemsJson)).not.toThrow();
  });
  it('weapons.json', () => {
    expect(() => z.array(weaponSchema).parse(weaponsJson)).not.toThrow();
  });
  it('armor.json', () => {
    expect(() => z.array(armorSchema).parse(armorJson)).not.toThrow();
  });
  it('enemies.json', () => {
    expect(() => z.array(enemySchema).parse(enemiesJson)).not.toThrow();
  });
  it('npcs.json', () => {
    expect(() => z.array(npcSchema).parse(npcsJson)).not.toThrow();
  });
  it('dialogue.json', () => {
    expect(() => dialogueTreeSchema.parse(dialogueJson)).not.toThrow();
  });
  it('sacre-base.json', () => {
    expect(() => mapSchema.parse(sacreBaseJson)).not.toThrow();
  });
  it('wasteland.json', () => {
    expect(() => mapSchema.parse(wastelandJson)).not.toThrow();
  });
});

describe('loadContentPack', () => {
  const pack = loadContentPack();

  it('returns populated maps with the expected sizes', () => {
    expect(pack.items.size).toBeGreaterThanOrEqual(6);
    expect(pack.weapons.size).toBeGreaterThanOrEqual(6);
    expect(pack.armor.size).toBeGreaterThanOrEqual(3);
    expect(pack.enemies.size).toBeGreaterThanOrEqual(5);
    expect(pack.npcs.size).toBeGreaterThanOrEqual(5);
    expect(pack.maps.size).toBe(2);
    expect(pack.maps.has('sacre_base')).toBe(true);
    expect(pack.maps.has('wasteland')).toBe(true);
  });

  it('every enemy weapon/armor reference resolves', () => {
    for (const enemy of pack.enemies.values()) {
      if (enemy.weaponClose) expect(pack.weapons.has(enemy.weaponClose)).toBe(true);
      if (enemy.weaponLong) expect(pack.weapons.has(enemy.weaponLong)).toBe(true);
      if (enemy.armor) expect(pack.armor.has(enemy.armor)).toBe(true);
      for (const drop of enemy.lootTable) {
        expect(pack.items.has(drop.itemId)).toBe(true);
      }
    }
  });

  it('every npc shopStock entry resolves to an item', () => {
    for (const npc of pack.npcs.values()) {
      if (!npc.shopStock) continue;
      for (const id of npc.shopStock) {
        expect(pack.items.has(id)).toBe(true);
      }
    }
  });

  it('every npc dialogueKey resolves to a dialogue node', () => {
    for (const npc of pack.npcs.values()) {
      expect(npc.dialogueKey in pack.dialogue).toBe(true);
    }
  });

  it('every map spawn refId resolves to the right collection', () => {
    for (const map of pack.maps.values()) {
      for (const spawn of map.spawns) {
        if (spawn.refId === undefined) continue;
        if (spawn.kind === 'npc') expect(pack.npcs.has(spawn.refId)).toBe(true);
        if (spawn.kind === 'enemy') expect(pack.enemies.has(spawn.refId)).toBe(true);
        if (spawn.kind === 'item') expect(pack.items.has(spawn.refId)).toBe(true);
      }
    }
  });

  it('every map tiles length equals width * height', () => {
    for (const map of pack.maps.values()) {
      expect(map.tiles.length).toBe(map.width * map.height);
    }
  });

  it('every dialogue choice.next is either null or an existing node id', () => {
    for (const [, node] of Object.entries(pack.dialogue)) {
      for (const choice of node.choices) {
        if (choice.next === null) continue;
        expect(choice.next in pack.dialogue).toBe(true);
      }
    }
  });

  it('map exits that target a local map land on in-bounds coordinates', () => {
    for (const map of pack.maps.values()) {
      for (const exit of map.exits) {
        const target = pack.maps.get(exit.toMapId);
        if (!target) continue;
        expect(exit.toX).toBeGreaterThanOrEqual(0);
        expect(exit.toX).toBeLessThan(target.width);
        expect(exit.toY).toBeGreaterThanOrEqual(0);
        expect(exit.toY).toBeLessThan(target.height);
      }
    }
  });

  it('wasteland map has at least three enemy spawns', () => {
    const wasteland = pack.maps.get('wasteland');
    expect(wasteland).toBeDefined();
    const enemySpawns = wasteland!.spawns.filter((s) => s.kind === 'enemy');
    expect(enemySpawns.length).toBeGreaterThanOrEqual(3);
  });

  it('sacre base map has a player_start spawn', () => {
    const sb = pack.maps.get('sacre_base');
    expect(sb).toBeDefined();
    expect(sb!.spawns.some((s) => s.kind === 'player_start')).toBe(true);
  });
});
