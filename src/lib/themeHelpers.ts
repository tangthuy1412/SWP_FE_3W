import type { Theme } from '../services/userService';

const THEME_STORAGE_KEY = 'theme';

let activeTheme: Theme = getCachedTheme();
let systemListenerAttached = false;

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function render(): void {
  const isDark = activeTheme === 'DARK' || (activeTheme === 'SYSTEM' && prefersDark());
  document.documentElement.classList.toggle('dark', isDark);
}

/**
 * Applies LIGHT/DARK/SYSTEM to the document root and caches the choice so the
 * next app startup can apply it immediately, before user settings load.
 */
export function applyTheme(theme: Theme): void {
  activeTheme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  render();

  if (theme === 'SYSTEM' && !systemListenerAttached) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (activeTheme === 'SYSTEM') render();
    });
    systemListenerAttached = true;
  }
}

export function getCachedTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'LIGHT' || stored === 'DARK' || stored === 'SYSTEM' ? stored : 'SYSTEM';
}
