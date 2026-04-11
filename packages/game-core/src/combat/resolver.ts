import { PCG32 } from '@lod/game-rng';
import { chebyshevDistance, max, min } from '../math-utils';
import {
  closeCombatDamage,
  critChance,
  fleeChance,
  hitChance,
  longRangeDamage,
  medkitHeal,
} from '../stats/formulas';
import type { Combatant, EntityId, TickNumber } from '../types';
import type { CombatAction } from './actions';
import type { CombatLogEntry, CombatSessionState } from './CombatSession';

/**
 * Medkit usage cap per combat session (faithful to the original — prevents
 * infinite sustain with a backpack full of medkits).
 */
const MAX_MEDKITS_PER_SESSION = 3;

/**
 * Well-known content ID for the basic medkit. `UseItem` delegates to this
 * handler when the item is a medkit. A more flexible item system would
 * dispatch via a registry, but for Phase 3 a single well-known ID is fine.
 *
 * Compared via `String()` so we don't have to drag in `toItemDefId` here —
 * the brand is erased at runtime and the comparison is purely string-valued.
 */
const MEDKIT_ITEM_ID: string = 'item.medkit';

/**
 * Resolve a single action against a combat session. Pure — never mutates the
 * input `session`, always returns a new state object with updated
 * participants, log entries, and advanced PRNG snapshot.
 *
 * This function does NOT change the turn index or check phase/outcome; that
 * is the state machine's job (`machine.ts`). It purely applies the mechanical
 * effects of the action: roll to hit, roll for damage, apply HP change,
 * append log entries.
 */
export function resolveAction(
  session: CombatSessionState,
  actorId: EntityId,
  action: CombatAction,
  tick: TickNumber,
): CombatSessionState {
  // Rehydrate the PRNG from the session snapshot so every roll below is
  // deterministic and replayable from the persisted state.
  const rng = PCG32.restore(session.prngSnapshot);

  // Clone participants so we can mutate local copies without touching the
  // input. We clone by value — Combatant is a flat record.
  const participants: Combatant[] = session.participants.map((p) => ({
    ...p,
    stats: { ...p.stats },
    position: { ...p.position },
  }));
  const log: CombatLogEntry[] = session.log.slice();

  const actor = participants.find((p) => p.id === actorId);
  if (actor === undefined || !actor.isAlive) {
    // Actor is gone — no-op, but still advance state so the caller sees a
    // fresh object. This can happen if a delayed network intent lands after
    // the actor died.
    return {
      ...session,
      participants,
      log,
      prngSnapshot: rng.snapshot(),
    };
  }

  switch (action.kind) {
    case 'Pass':
      // Intentionally nothing. Turn is still consumed by the state machine.
      break;

    case 'AttackLongRange':
    case 'AttackClose': {
      const target = participants.find((p) => p.id === action.targetId);
      if (target === undefined || !target.isAlive) break;

      const isLong = action.kind === 'AttackLongRange';
      const weapon = isLong ? actor.weaponLong : actor.weaponClose;
      // Validate the weapon matches the requested id. We still resolve even
      // if it does not — upstream `machine.submitAction` has already done
      // the authorization check — but we fall back to "no weapon" → miss.
      if (weapon === undefined || weapon.id !== action.weaponId) {
        log.push({
          kind: 'miss',
          actor: actor.id,
          target: target.id,
          weaponId: action.weaponId,
          tick,
        });
        break;
      }

      const distance = chebyshevDistance(actor.position, target.position);
      const rangeMod = isLong && distance > (weapon.optimalRange ?? 5) ? -0.15 : 0;
      const chance = hitChance({
        attackerDex: actor.stats.dex,
        defenderAgl: target.stats.agl,
        weaponAccuracyBonus: weapon.accuracy,
        rangeModifier: rangeMod,
        coverModifier: 0,
      });

      const hitRoll = rng.nextFloat();
      if (hitRoll >= chance) {
        log.push({
          kind: 'miss',
          actor: actor.id,
          target: target.id,
          weaponId: weapon.id,
          tick,
        });
        break;
      }

      // Determine crit before rolling damage so both rolls live in a stable
      // order regardless of whether the attack hit.
      const critP = critChance(actor.stats.dex, target.stats.dex);
      const critRoll = rng.nextFloat();
      const isCrit = critRoll < critP;

      let damage: number;
      if (isLong) {
        damage = longRangeDamage({
          rng,
          attackerDex: actor.stats.dex,
          weapon,
          distance,
          armorSoakLong: target.armor?.soakLong ?? 0,
        });
      } else {
        damage = closeCombatDamage({
          rng,
          attackerStr: actor.stats.str,
          weapon,
          armorSoak: target.armor?.soak ?? 0,
        });
      }
      if (isCrit) damage *= 2;

      target.stats.hp = max(0, target.stats.hp - damage);
      log.push({
        kind: 'hit',
        actor: actor.id,
        target: target.id,
        weaponId: weapon.id,
        damage,
        crit: isCrit,
        tick,
      });

      if (target.stats.hp <= 0 && target.isAlive) {
        target.isAlive = false;
        log.push({ kind: 'defeat', actor: target.id, tick });
      }
      break;
    }

    case 'UseItem': {
      if (String(action.itemDefId) !== MEDKIT_ITEM_ID) {
        // Non-medkit items are no-ops at Phase 3; the registry arrives later.
        break;
      }
      if (actor.medkitsUsedThisSession >= MAX_MEDKITS_PER_SESSION) {
        // Cap reached — drop silently. The state machine's submitAction will
        // ideally reject this before we get here; this is a belt-and-braces.
        break;
      }
      const amount = medkitHeal(rng, actor.stats.dex);
      const healed = min(actor.stats.hpMax, actor.stats.hp + amount);
      const applied = healed - actor.stats.hp;
      actor.stats.hp = healed;
      actor.medkitsUsedThisSession += 1;
      log.push({ kind: 'heal', actor: actor.id, amount: applied, tick });
      break;
    }

    case 'Flee': {
      // Pick the highest-AGL opponent as the "reference" flee resistance.
      // This makes multi-target flee harder than a 1v1.
      const opponents = participants.filter(
        (p) => p.isAlive && p.team !== actor.team,
      );
      const worstAgl = opponents.reduce(
        (acc, cur) => max(acc, cur.stats.agl),
        0,
      );
      const chance = fleeChance(actor.stats.agl, worstAgl);
      const roll = rng.nextFloat();
      const success = roll < chance;
      log.push({ kind: 'flee', actor: actor.id, success, tick });
      if (success) {
        // Successful flee marks the actor inactive (and, in the real server,
        // exits them from the session entirely). We encode that here as
        // `isAlive = false` for turn-order purposes; loot/death logic in
        // `machine.checkOutcome` distinguishes fled from defeated by the
        // final log entry.
        actor.isAlive = false;
      }
      break;
    }
  }

  return {
    ...session,
    participants,
    log,
    prngSnapshot: rng.snapshot(),
  };
}
