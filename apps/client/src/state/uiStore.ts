import { create } from 'zustand';

export type AppView = 'login' | 'characters' | 'game';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export type ModalId = 'inventory' | 'character-sheet' | 'combat-log' | null;

export interface UiState {
  view: AppView;
  user: AuthenticatedUser | null;
  modal: ModalId;
  setView: (view: AppView) => void;
  setUser: (user: AuthenticatedUser | null) => void;
  openModal: (modal: ModalId) => void;
  closeModal: () => void;
}

/**
 * UI-only state: routing hints, authenticated user mirror, and the currently
 * open modal. Kept intentionally small — long-lived server state lives in
 * TanStack Query and live game state lives in `worldStore`.
 */
export const useUiStore = create<UiState>((set) => ({
  view: 'login',
  user: null,
  modal: null,
  setView: (view) => set({ view }),
  setUser: (user) => set({ user }),
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
}));
