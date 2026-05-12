import { atom } from 'nanostores';

const THEME_KEY = 'eventcatalog-theme';

export type Theme = 'light' | 'dark';

export const themeStore = atom<Theme>('dark');

// Default theme when the user has not explicitly chosen one.
const getDefaultTheme = (): Theme => {
  return 'dark';
};

// Apply theme to document via data-theme attribute
const applyTheme = (theme: Theme) => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
};

// Initialize store from localStorage or system preference
const initStore = () => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      if (stored && (stored === 'light' || stored === 'dark')) {
        // User has explicitly chosen a theme, use that
        themeStore.set(stored);
        applyTheme(stored);
      } else {
        // No stored preference, use the catalog default
        const defaultTheme = getDefaultTheme();
        themeStore.set(defaultTheme);
        applyTheme(defaultTheme);
      }
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
      // Only follow system preference if user hasn't explicitly set a theme
      const stored = localStorage.getItem(THEME_KEY);
      if (!stored) {
        const newTheme = e.matches ? 'dark' : 'light';
        themeStore.set(newTheme);
        applyTheme(newTheme);
      }
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
