import { type ThemePreference } from '@/types/models';

export function resolveThemePreference(preference: ThemePreference) {
  if (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return preference === 'system' ? 'light' : preference;
}

export function applyThemePreference(preference: ThemePreference) {
  const root = document.documentElement;
  const resolved = resolveThemePreference(preference);

  root.classList.toggle('dark', resolved === 'dark');
  root.dataset.theme = preference;
}
