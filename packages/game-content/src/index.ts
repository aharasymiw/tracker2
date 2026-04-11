export { loadContentPack, type ContentPack } from './loader.js';

export {
  itemSchema,
  weaponSchema,
  armorSchema,
  enemySchema,
  npcSchema,
  dialogueNodeSchema,
  dialogueTreeSchema,
  mapSchema,
  tileKindEnum,
  spawnSchema,
  exitSchema,
  type Item,
  type Weapon,
  type Armor,
  type Enemy,
  type Npc,
  type DialogueNode,
  type DialogueTree,
  type MapDef,
  type TileKind,
} from './schemas/index.js';

import { loadContentPack } from './loader.js';

/**
 * Pre-loaded content pack. Evaluating this module validates every JSON file
 * in the package; importing it anywhere is a cheap, cached integrity check.
 */
export const defaultContentPack = loadContentPack();
