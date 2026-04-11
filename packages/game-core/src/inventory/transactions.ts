import type { Result } from '@lod/shared-utils';
import { err, ok } from '@lod/shared-utils';
import type { ItemInstanceId } from '../types';
import type { Inventory } from './Inventory';

/**
 * Atomic transfer of a single item instance between two inventories. This is
 * pure — the input inventories are *not* mutated. Returns two fresh
 * `Inventory` instances on success, both sides rolled back implicitly on
 * failure (we never partially apply because we build the clones first).
 *
 * Failure cases:
 * - `not_found`: the instance wasn't in `from`.
 * - `duplicate_instance`: the instance was already in `to` — this should
 *   never happen if the server honors the unique-location constraint, but we
 *   surface it anyway to make the anti-dupe contract explicit.
 */
export function transferItem(
  from: Inventory,
  to: Inventory,
  instanceId: ItemInstanceId,
): Result<{ from: Inventory; to: Inventory }, 'not_found' | 'duplicate_instance'> {
  const fromClone = from.clone();
  const toClone = to.clone();

  const removed = fromClone.remove(instanceId);
  if (!removed.ok) return err(removed.error);

  const added = toClone.add(removed.value);
  if (!added.ok) return err(added.error);

  return ok({ from: fromClone, to: toClone });
}
