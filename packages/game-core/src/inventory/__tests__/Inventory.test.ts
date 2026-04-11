import { describe, expect, it } from 'vitest';
import { toItemDefId, toItemInstanceId } from '@lod/shared-utils';
import { Inventory, type InventoryItemInstance } from '../Inventory';
import { transferItem } from '../transactions';

const mkItem = (id: string): InventoryItemInstance => ({
  instanceId: toItemInstanceId(id),
  defId: toItemDefId('item.medkit'),
  qty: 1,
});

describe('Inventory', () => {
  it('adds and retrieves items', () => {
    const inv = new Inventory();
    const add = inv.add(mkItem('a'));
    expect(add.ok).toBe(true);
    expect(inv.get(toItemInstanceId('a'))?.instanceId).toBe('a');
  });

  it('rejects duplicate instance ids', () => {
    const inv = new Inventory();
    inv.add(mkItem('a'));
    const second = inv.add(mkItem('a'));
    expect(second.ok).toBe(false);
  });

  it('removes an item and returns it', () => {
    const inv = new Inventory([mkItem('a')]);
    const removed = inv.remove(toItemInstanceId('a'));
    expect(removed.ok).toBe(true);
    expect(inv.size()).toBe(0);
  });

  it('errors when removing a missing item', () => {
    const inv = new Inventory();
    const removed = inv.remove(toItemInstanceId('ghost'));
    expect(removed.ok).toBe(false);
  });

  it('finds equipped items by slot', () => {
    const inv = new Inventory([
      { ...mkItem('blade'), equippedSlot: 'weaponClose' },
      mkItem('spare'),
    ]);
    expect(inv.equipped('weaponClose')?.instanceId).toBe('blade');
    expect(inv.equipped('weaponLong')).toBeUndefined();
  });

  it('list() returns a defensive copy', () => {
    const inv = new Inventory([mkItem('a')]);
    const list = inv.list();
    // Mutating the returned list must not affect the inventory.
    (list as InventoryItemInstance[]).pop();
    expect(inv.size()).toBe(1);
  });
});

describe('transferItem', () => {
  it('moves an item from one inventory to another', () => {
    const from = new Inventory([mkItem('a')]);
    const to = new Inventory();
    const r = transferItem(from, to, toItemInstanceId('a'));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.from.size()).toBe(0);
    expect(r.value.to.size()).toBe(1);
    // Inputs are untouched.
    expect(from.size()).toBe(1);
    expect(to.size()).toBe(0);
  });

  it('fails cleanly when the source is missing the item', () => {
    const from = new Inventory();
    const to = new Inventory();
    const r = transferItem(from, to, toItemInstanceId('ghost'));
    expect(r.ok).toBe(false);
  });

  it('fails cleanly on duplicate target instance', () => {
    const from = new Inventory([mkItem('a')]);
    const to = new Inventory([mkItem('a')]);
    const r = transferItem(from, to, toItemInstanceId('a'));
    expect(r.ok).toBe(false);
  });
});
