import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clampPanelWidth, MAX_PANEL_WIDTH, MIN_PANEL_WIDTH, PANEL_WIDTH, readPanelWidth, savePanelWidth } from '../panel-width';

describe('clampPanelWidth', () => {
  it('keeps a width between the limits as it is', () => {
    expect(clampPanelWidth(560.4, 1600)).toBe(560);
  });

  it('is never narrower than the minimum or wider than the maximum', () => {
    expect(clampPanelWidth(100, 1600)).toBe(MIN_PANEL_WIDTH);
    expect(clampPanelWidth(5000, 3000)).toBe(MAX_PANEL_WIDTH);
  });

  it('leaves room for the page in a narrow window', () => {
    expect(clampPanelWidth(800, 1100)).toBe(620);
    expect(clampPanelWidth(800, 700)).toBe(MIN_PANEL_WIDTH);
  });
});

describe('remembering the width', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('is the default until they resize it', () => {
    expect(readPanelWidth(1600)).toBe(PANEL_WIDTH);
  });

  it('opens at the width they left it at, within what the window allows', () => {
    savePanelWidth(640);
    expect(readPanelWidth(1600)).toBe(640);
    expect(readPanelWidth(1000)).toBe(520);
  });

  it('forgets it when they put it back to the default', () => {
    savePanelWidth(640);
    savePanelWidth(PANEL_WIDTH);
    expect(store.size).toBe(0);
  });

  it('is the default when the browser keeps nothing', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
    });
    expect(readPanelWidth(1600)).toBe(PANEL_WIDTH);
    expect(() => savePanelWidth(640)).not.toThrow();
  });
});
