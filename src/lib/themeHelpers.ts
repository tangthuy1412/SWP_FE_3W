import type { Theme } from '../services/userService';

const THEME_STORAGE_KEY = 'theme';

/**
 * Applies LIGHT/DARK/SYSTEM to the document root and caches the choice so the
 * next app startup can apply it immediately, before user settings load.
 */
export function applyTheme(theme: Theme): void {
  // The product uses one high-contrast light visual language. Keep accepting
  // the backend value for compatibility, but render consistently in light mode.
  void theme;
  localStorage.setItem(THEME_STORAGE_KEY, 'LIGHT');
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = 'light';
}

export function getCachedTheme(): Theme {
  return 'LIGHT';
}
