/**
 * @lod/game-core — public API barrel.
 *
 * Everything a consumer (server action handler, client optimistic preview)
 * needs to simulate a combat or validate a character action is re-exported
 * here. Importing from deep paths is supported for bundler tree-shaking but
 * not required.
 */

// Core types
export * from './types';

// Math helpers (exported so other packages have one place to grab determinism-safe helpers)
export * as mathUtils from './math-utils';

// Stats and formulas
export * from './stats/formulas';
export * from './stats/training';

// World primitives
export * from './world/TileMap';
export * from './world/Movement';
export * from './world/LineOfSight';
export * from './world/Pathfinding';

// Inventory
export * from './inventory/Inventory';
export * from './inventory/transactions';

// Combat
export * from './combat/actions';
export * from './combat/initiative';
export * from './combat/CombatSession';
export * from './combat/resolver';
export * from './combat/machine';

// Stubs for later phases (types only)
export * from './fortress/Fortress';
export * from './fortress/RoboDefender';
export * from './fortress/Raid';
export * from './puritron/QuestState';
