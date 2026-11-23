import { atom } from 'nanostores';
import { isColorModeDefault, type ColorModeDefault } from '@utils/color-mode';

const THEME_KEY = 'eventcatalog-theme';

export type Theme = 'light' | 'dark';

// Default theme when the user has not explicitly chosen one and the catalog doesn't set `colorMode.default`.
// This is also the value the store holds during server rendering, so SSR-safe hooks must hydrate against it.
export const DEFAULT_THEME: Theme = 'dark';

export const themeStore = atom<Theme>(DEFAULT_THEME);

// The catalog's colorMode config, which BaseLayout puts on <html>
const getColorModeDefault = (): ColorModeDefault => {
  const value = typeof document !== 'undefined' ? document.documentElement.dataset.colorMode : undefined;
  return isColorModeDefault(value) ? value : DEFAULT_THEME;
};

const isToggleAllowed = (): boolean =>
  typeof document === 'undefined' || document.documentElement.dataset.colorModeToggle !== 'false';

const getDefaultTheme = (): Theme => {
  const colorMode = getColorModeDefault();
  if (colorMode !== 'system') return colorMode;
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

// The visitor's saved choice, unless the catalog hides the toggle (then it doesn't apply). Null when storage is
// blocked (e.g. a third-party iframe), so the store and the page still agree on the default.
const getStoredTheme = (): Theme | null => {
  if (!isToggleAllowed()) return null;
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
};

const getEmbeddedTheme = (): Theme | null => {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const requestedTheme = params.get('theme');
  const embedded = params.get('embed') === 'true';
  return embedded && (requestedTheme === 'light' || requestedTheme === 'dark') ? requestedTheme : null;
};

// Apply theme to document via data-theme attribute
const applyTheme = (theme: Theme) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
};

// Initialize store from localStorage or the catalog's default
const initStore = () => {
  if (typeof window !== 'undefined') {
    try {
      const embeddedTheme = getEmbeddedTheme();
      if (embeddedTheme) {
        themeStore.set(embeddedTheme);
        applyTheme(embeddedTheme);
        return;
      }

      // The visitor's saved choice, or the catalog's default
      const theme = getStoredTheme() ?? getDefaultTheme();
      themeStore.set(theme);
      applyTheme(theme);
    } catch (e) {
      console.warn('Failed to load theme:', e);
      applyTheme(getDefaultTheme());
    }
  }
};

if (typeof window !== 'undefined') {
  initStore();

  // Listen for system preference changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only follow the system when the catalog's default is 'system' and the visitor hasn't chosen a theme
      if (getEmbeddedTheme() || getColorModeDefault() !== 'system' || getStoredTheme()) return;

      const newTheme = e.matches ? 'dark' : 'light';
      themeStore.set(newTheme);
      applyTheme(newTheme);
    });
  }

  // Listen for storage events (cross-tab sync)
  window.addEventListener('storage', (e) => {
    if (e.key === THEME_KEY) {
      initStore();
    }
  });

  // Listen for custom events (same-tab sync between instances)
  window.addEventListener('theme-updated', () => {
    initStore();
  });
}

export const setTheme = (theme: Theme) => {
  themeStore.set(theme);
  applyTheme(theme);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(THEME_KEY, theme);
      // Dispatch event to notify other store instances/components
      window.dispatchEvent(new CustomEvent('theme-updated'));
    } catch (e) {
      console.warn('Failed to save theme:', e);
    }
  }
};

export const toggleTheme = () => {
  const current = themeStore.get();
  setTheme(current === 'light' ? 'dark' : 'light');
};
