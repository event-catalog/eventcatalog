// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot, type Root } from 'react-dom/client';
import { DEFAULT_THEME, themeStore } from '@stores/theme-store';
import { useDarkMode } from '../useDarkMode';

// Renders the hook's value as text so we can assert on the DOM.
const ThemeProbe = () => createElement('span', null, useDarkMode() ? 'dark' : 'light');

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('useDarkMode', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    container.remove();
    consoleError.mockRestore();
    themeStore.set(DEFAULT_THEME);
  });

  it('server rendering always uses the default theme, even when the store already holds a client preference', () => {
    themeStore.set('light');

    expect(renderToString(createElement(ThemeProbe))).toContain('dark');
  });

  it('hydrates against the server markup and then switches to the stored light preference without a hydration mismatch', () => {
    // Server renders with the default (dark) theme…
    container.innerHTML = renderToString(createElement(ThemeProbe));
    expect(container.textContent).toBe('dark');

    // …but a returning user's stored preference has already been loaded into the store before React hydrates.
    themeStore.set('light');

    act(() => {
      root = hydrateRoot(container, createElement(ThemeProbe));
    });

    expect(container.textContent).toBe('light');
    const hydrationWarnings = consoleError.mock.calls.filter((call) => String(call[0]).match(/did not match|hydrat/i));
    expect(hydrationWarnings).toEqual([]);
  });

  it('follows theme changes after hydration', () => {
    container.innerHTML = renderToString(createElement(ThemeProbe));
    act(() => {
      root = hydrateRoot(container, createElement(ThemeProbe));
    });
    expect(container.textContent).toBe('dark');

    act(() => themeStore.set('light'));
    expect(container.textContent).toBe('light');

    act(() => themeStore.set('dark'));
    expect(container.textContent).toBe('dark');
  });
});
