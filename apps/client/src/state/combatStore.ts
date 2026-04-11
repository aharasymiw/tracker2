import { create } from 'zustand';

/** Client-view subset of the authoritative CombatSessionState. */
export interface CombatParticipantView {
  id: string;
  name: string;
  team: 'A' | 'B';
  hp: number;
  hpMax: number;
  isAlive: boolean;
}

export interface CombatSessionView {
  id: string;
  phase: 'LongRange' | 'CloseCombat' | 'Resolution';
  round: number;
  currentTurnEntityId: string | null;
  turnDeadlineMs: number | null;
  participants: CombatParticipantView[];
  log: string[];
}

export interface CombatStore {
  active: CombatSessionView | null;
  setActive(session: CombatSessionView | null): void;
  appendLog(line: string): void;
  clear(): void;
}

export const useCombatStore = create<CombatStore>((set) => ({
  active: null,
  setActive: (session) => set({ active: session }),
  appendLog: (line) =>
    set((state) => {
      if (state.active === null) return state;
      return {
        active: { ...state.active, log: [...state.active.log, line] },
      };
    }),
  clear: () => set({ active: null }),
}));
