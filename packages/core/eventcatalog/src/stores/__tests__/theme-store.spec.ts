// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (event: { matches: boolean }) => void;

let prefersLight = false;
let systemListeners: Listener[] = [];

// The store sets itself up when it's imported, so each test imports a fresh copy
const loadStore = async ({ colorMode, toggle }: { colorMode?: string; toggle?: boolean } = {}) => {
  const root = document.documentElement;
  if (colorMode) root.dataset.colorMode = colorMode;
  if (toggle !== undefined) root.dataset.colorModeToggle = String(toggle);
  vi.resetModules();
  return import('@stores/theme-store');
};

// The OS switching between light and dark
const changeSystemTheme = (theme: 'light' | 'dark') => {
  prefersLight = theme === 'light';
  for (const listener of systemListeners) listener({ matches: theme === 'dark' });
};

describe('theme store', () => {
  beforeEach(() => {
    // An in-memory localStorage, so the test doesn't depend on the Node version's own
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    });
    prefersLight = false;
    systemListeners = [];
    window.matchMedia = vi.fn((query: string) => ({
      matches: query.includes('light') ? prefersLight : !prefersLight,
      addEventListener: (_: string, listener: Listener) => systemListeners.push(listener),
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    const root = document.documentElement;
    delete root.dataset.colorMode;
    delete root.dataset.colorModeToggle;
    root.removeAttribute('data-theme');
  });

  it('opens in dark mode when the catalog does not set a color mode', async () => {
    const { themeStore } = await loadStore();

    expect(themeStore.get()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it("opens in the catalog's default mode", async () => {
    const { themeStore } = await loadStore({ colorMode: 'light' });

    expect(themeStore.get()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it("uses the visitor's saved choice over the catalog's default", async () => {
    localStorage.setItem('eventcatalog-theme', 'dark');
    const { themeStore } = await loadStore({ colorMode: 'light' });

    expect(themeStore.get()).toBe('dark');
  });

  it("ignores the visitor's saved choice when the catalog hides the toggle", async () => {
    localStorage.setItem('eventcatalog-theme', 'dark');
    const { themeStore } = await loadStore({ colorMode: 'light', toggle: false });

    expect(themeStore.get()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it("follows the visitor's system when the catalog's default is system", async () => {
    prefersLight = true;
    const { themeStore } = await loadStore({ colorMode: 'system' });
    expect(themeStore.get()).toBe('light');

    changeSystemTheme('dark');
    expect(themeStore.get()).toBe('dark');
  });

  it('stops following the system once the visitor chooses a mode', async () => {
    const { themeStore, setTheme } = await loadStore({ colorMode: 'system' });
    setTheme('light');

    changeSystemTheme('dark');
    expect(themeStore.get()).toBe('light');
  });

  it("uses the catalog's default when storage is blocked", async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    const { themeStore } = await loadStore({ colorMode: 'light' });

    expect(themeStore.get()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('does not follow the system when the catalog sets a fixed default', async () => {
    const { themeStore } = await loadStore({ colorMode: 'dark' });

    changeSystemTheme('light');
    expect(themeStore.get()).toBe('dark');
  });
});
