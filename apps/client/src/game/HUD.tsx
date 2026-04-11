import type { ReactElement, ReactNode } from 'react';
import { useWorldStore } from '../state/worldStore';

/**
 * On-screen heads-up display. Reads the current character projection from
 * `worldStore` via a narrow selector so unrelated store updates don't force a
 * re-render.
 */
export function HUD(): ReactElement {
  const character = useWorldStore((state) => state.character);
  if (character === null) {
    return (
      <div className="flex items-center gap-4 bg-neutral-900/80 px-4 py-2 text-xs text-neutral-500">
        <span>Awaiting world snapshot...</span>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-neutral-800 bg-neutral-900/80 px-4 py-2 font-mono text-xs text-neutral-200">
      <HudField label="HP">
        <span className="text-toxic-400">
          {character.hp}/{character.hpMax}
        </span>
      </HudField>
      <HudField label="STR">{character.str}</HudField>
      <HudField label="DEX">{character.dex}</HudField>
      <HudField label="AGL">{character.agl}</HudField>
      <HudField label="CR">{character.credits}</HudField>
      <HudField label="TRN">{character.turnsRemaining}</HudField>
    </div>
  );
}

interface HudFieldProps {
  label: string;
  children: ReactNode;
}

function HudField({ label, children }: HudFieldProps): ReactElement {
  return (
    <div className="flex items-center gap-1">
      <span className="text-neutral-500">{label}</span>
      <span>{children}</span>
    </div>
  );
}
