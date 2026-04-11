import { z } from 'zod';

import itemsJson from './data/items.json' with { type: 'json' };
import weaponsJson from './data/weapons.json' with { type: 'json' };
import armorJson from './data/armor.json' with { type: 'json' };
import enemiesJson from './data/enemies.json' with { type: 'json' };
import npcsJson from './data/npcs.json' with { type: 'json' };
import dialogueJson from './data/dialogue.json' with { type: 'json' };
import sacreBaseJson from './data/maps/sacre-base.json' with { type: 'json' };
import wastelandJson from './data/maps/wasteland.json' with { type: 'json' };

import {
  itemSchema,
  weaponSchema,
  armorSchema,
  enemySchema,
  npcSchema,
  dialogueTreeSchema,
  mapSchema,
  type Item,
  type Weapon,
  type Armor,
  type Enemy,
  type Npc,
  type DialogueTree,
  type MapDef,
} from './schemas/index.js';

export interface ContentPack {
  items: ReadonlyMap<string, Item>;
  weapons: ReadonlyMap<string, Weapon>;
  armor: ReadonlyMap<string, Armor>;
  enemies: ReadonlyMap<string, Enemy>;
  npcs: ReadonlyMap<string, Npc>;
  dialogue: DialogueTree;
  maps: ReadonlyMap<string, MapDef>;
  version: string;
}

/**
 * Load, validate, and cross-check every piece of content in the package.
 *
 * Throws on the first validation failure or broken reference. Because content
 * consistency is the entire point of this package, the loader is intentionally
 * strict - a failure here means shipping content is broken.
 */
export function loadContentPack(): ContentPack {
  const items = z.array(itemSchema).parse(itemsJson);
  const weapons = z.array(weaponSchema).parse(weaponsJson);
  const armor = z.array(armorSchema).parse(armorJson);
  const enemies = z.array(enemySchema).parse(enemiesJson);
  const npcs = z.array(npcSchema).parse(npcsJson);
  const dialogue = dialogueTreeSchema.parse(dialogueJson);
  const sacreBase = mapSchema.parse(sacreBaseJson);
  const wasteland = mapSchema.parse(wastelandJson);

  const itemsById = new Map(items.map((i) => [i.id, i]));
  const weaponsById = new Map(weapons.map((w) => [w.id, w]));
  const armorById = new Map(armor.map((a) => [a.id, a]));
  const enemiesById = new Map(enemies.map((e) => [e.id, e]));
  const npcsById = new Map(npcs.map((n) => [n.id, n]));
  const mapsById = new Map<string, MapDef>([
    [sacreBase.id, sacreBase],
    [wasteland.id, wasteland],
  ]);

  // --- Referential integrity checks ---------------------------------------

  for (const enemy of enemies) {
    if (enemy.weaponClose !== undefined && !weaponsById.has(enemy.weaponClose)) {
      throw new Error(
        `enemy '${enemy.id}' references missing weaponClose '${enemy.weaponClose}'`,
      );
    }
    if (enemy.weaponLong !== undefined && !weaponsById.has(enemy.weaponLong)) {
      throw new Error(
        `enemy '${enemy.id}' references missing weaponLong '${enemy.weaponLong}'`,
      );
    }
    if (enemy.armor !== undefined && !armorById.has(enemy.armor)) {
      throw new Error(`enemy '${enemy.id}' references missing armor '${enemy.armor}'`);
    }
    for (const drop of enemy.lootTable) {
      if (!itemsById.has(drop.itemId)) {
        throw new Error(
          `enemy '${enemy.id}' loot table references missing item '${drop.itemId}'`,
        );
      }
    }
  }

  for (const npc of npcs) {
    if (npc.shopStock) {
      for (const itemId of npc.shopStock) {
        if (!itemsById.has(itemId)) {
          throw new Error(
            `npc '${npc.id}' shopStock references missing item '${itemId}'`,
          );
        }
      }
    }
    if (!(npc.dialogueKey in dialogue)) {
      throw new Error(
        `npc '${npc.id}' dialogueKey '${npc.dialogueKey}' has no matching dialogue node`,
      );
    }
  }

  for (const map of mapsById.values()) {
    for (const spawn of map.spawns) {
      if (spawn.refId === undefined) continue;
      if (spawn.kind === 'npc' && !npcsById.has(spawn.refId)) {
        throw new Error(
          `map '${map.id}' npc spawn references missing npc '${spawn.refId}'`,
        );
      }
      if (spawn.kind === 'enemy' && !enemiesById.has(spawn.refId)) {
        throw new Error(
          `map '${map.id}' enemy spawn references missing enemy '${spawn.refId}'`,
        );
      }
      if (spawn.kind === 'item' && !itemsById.has(spawn.refId)) {
        throw new Error(
          `map '${map.id}' item spawn references missing item '${spawn.refId}'`,
        );
      }
    }
    for (const exit of map.exits) {
      const target = mapsById.get(exit.toMapId);
      if (target === undefined) continue; // forward-reference to a map in another pack
      if (
        exit.toX < 0 ||
        exit.toX >= target.width ||
        exit.toY < 0 ||
        exit.toY >= target.height
      ) {
        throw new Error(
          `map '${map.id}' exit to '${exit.toMapId}' points outside target bounds (${exit.toX}, ${exit.toY})`,
        );
      }
    }
  }

  // Every dialogue choice's `next` must resolve to another node in the flat
  // tree or be null (exit).
  for (const [nodeId, node] of Object.entries(dialogue)) {
    for (const choice of node.choices) {
      if (choice.next === null) continue;
      if (!(choice.next in dialogue)) {
        throw new Error(
          `dialogue node '${nodeId}' choice '${choice.label}' points to missing node '${choice.next}'`,
        );
      }
    }
  }

  return {
    items: itemsById,
    weapons: weaponsById,
    armor: armorById,
    enemies: enemiesById,
    npcs: npcsById,
    dialogue,
    maps: mapsById,
    version: 'dev',
  };
}
