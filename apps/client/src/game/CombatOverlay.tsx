import type { ReactElement } from 'react';
import { useCombatStore } from '../state/combatStore';

/**
 * Full-viewport overlay shown while a combat session is active. Subscribes
 * only to the `active` field on the combat store so HUD changes don't
 * unnecessarily re-render the overlay.
 */
export function CombatOverlay(): ReactElement | null {
  const active = useCombatStore((state) => state.active);
  if (active === null) return null;
  return (
    <div
      role="dialog"
      aria-label="combat-overlay"
      className="pointer-events-none absolute inset-0 flex items-end justify-center p-6"
    >
      <div className="pointer-events-auto w-full max-w-2xl rounded border border-toxic-600 bg-neutral-950/90 p-4 font-mono text-sm text-toxic-400 shadow-lg">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-toxic-500">
            Combat · {active.phase} · Round {active.round}
          </span>
          {active.turnDeadlineMs !== null ? (
            <span className="text-xs text-neutral-400">
              Deadline: {active.turnDeadlineMs}
            </span>
          ) : null}
        </div>
        <ul className="flex flex-col gap-1 text-xs">
          {active.participants.map((participant) => (
            <li key={participant.id} className="flex justify-between">
              <span>
                {participant.name} ({participant.team})
              </span>
              <span>
                {participant.hp}/{participant.hpMax}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
