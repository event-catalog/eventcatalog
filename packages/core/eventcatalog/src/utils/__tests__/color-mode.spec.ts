import { describe, expect, it } from 'vitest';
import { getColorMode } from '@utils/color-mode';

describe('getColorMode', () => {
  it('opens in dark mode with the toggle when the catalog does not set colorMode', () => {
    expect(getColorMode({})).toEqual({ default: 'dark', allowToggle: true });
    expect(getColorMode(undefined)).toEqual({ default: 'dark', allowToggle: true });
  });

  it("uses the catalog's default mode", () => {
    expect(getColorMode({ colorMode: { default: 'light' } })).toEqual({ default: 'light', allowToggle: true });
    expect(getColorMode({ colorMode: { default: 'system' } })).toEqual({ default: 'system', allowToggle: true });
  });

  it('hides the toggle only when allowToggle is false', () => {
    expect(getColorMode({ colorMode: { default: 'light', allowToggle: false } })).toEqual({
      default: 'light',
      allowToggle: false,
    });
    expect(getColorMode({ colorMode: { allowToggle: true } }).allowToggle).toBe(true);
  });

  it('falls back to dark for a default it does not know', () => {
    expect(getColorMode({ colorMode: { default: 'blue' } }).default).toBe('dark');
  });
});
