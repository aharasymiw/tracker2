import type { Result } from '@lod/shared-utils';
import { err, ok } from '@lod/shared-utils';
import type { ItemDefId, ItemInstanceId } from '../types';

/**
 * Slot names for equipment. Matches the three slots the combat system reads
 * from a `Combatant`.
 */
export type EquipSlot = 'weaponClose' | 'weaponLong' | 'armor';

/**
 * A single item instance inside an inventory. The unique `instanceId` is the
 * anti-dupe anchor used by the Postgres partial unique index (see the data
 * model in the plan) — we mirror the same uniqueness inside the in-memory
 * inventory.
 */
export interface InventoryItemInstance {
  instanceId: ItemInstanceId;
  defId: ItemDefId;
  qty: number;
  equippedSlot?: EquipSlot | null;
  metadata?: Record<string, unknown>;
}

/**
 * Minimal, intentionally stateless-ish inventory container. It holds a Map
 * of item instances keyed by instanceId and nothing else — no cached totals,
 * no encumbrance math. Higher-level rules (weight limits, class restrictions)
 * belong to callers so this class stays trivially testable.
 *
 * Mutation methods (`add`, `remove`) return Results; the instance IS mutated
 * on success. For pure transfers use `transferItem` from `./transactions.ts`
 * which builds fresh inventories.
 */
export class Inventory {
  private readonly items: Map<ItemInstanceId, InventoryItemInstance>;

  constructor(items: readonly InventoryItemInstance[] = []) {
    this.items = new Map();
    for (const item of items) {
      if (this.items.has(item.instanceId)) {
        throw new Error(
          `Inventory: duplicate instanceId ${String(item.instanceId)} in initial items`,
        );
      }
      // Clone so the caller's array can't mutate our internals.
      this.items.set(item.instanceId, { ...item });
    }
  }

  /** Insert a new item instance. Fails if the `instanceId` already exists. */
  add(item: InventoryItemInstance): Result<void, 'duplicate_instance'> {
    if (this.items.has(item.instanceId)) {
      return err('duplicate_instance');
    }
    this.items.set(item.instanceId, { ...item });
    return ok(undefined);
  }

  /** Remove and return an item. Fails if not present. */
  remove(
    instanceId: ItemInstanceId,
  ): Result<InventoryItemInstance, 'not_found'> {
    const existing = this.items.get(instanceId);
    if (existing === undefined) return err('not_found');
    this.items.delete(instanceId);
    return ok(existing);
  }

  /** Read-only accessor. */
  get(instanceId: ItemInstanceId): InventoryItemInstance | undefined {
    const entry = this.items.get(instanceId);
    // Defensive copy so callers can't mutate backing storage.
    return entry === undefined ? undefined : { ...entry };
  }

  /** Snapshot of all items, in insertion order. Read-only. */
  list(): readonly InventoryItemInstance[] {
    return Array.from(this.items.values(), (entry) => ({ ...entry }));
  }

  /**
   * Find the item equipped in a given slot, if any. Only one item may be
   * equipped per slot; if duplicates are somehow present we return the first.
   */
  equipped(slot: EquipSlot): InventoryItemInstance | undefined {
    for (const entry of this.items.values()) {
      if (entry.equippedSlot === slot) return { ...entry };
    }
    return undefined;
  }

  /** Count of item instances in the inventory. */
  size(): number {
    return this.items.size;
  }

  /**
   * Clone the inventory. Used by `transferItem` (and tests) to produce a
   * fresh instance without re-running constructor validation.
   */
  clone(): Inventory {
    return new Inventory(this.list());
  }
}
