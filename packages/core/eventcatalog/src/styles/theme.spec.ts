import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const themeCss = readFileSync(new URL('./theme.css', import.meta.url), 'utf8');

describe('dark theme documentation compatibility', () => {
  it('uses theme colors for legacy generated pills', () => {
    const rule = themeCss.match(
      /:root\[data-theme="dark"\] \.prose \.rounded-full\.text-gray-900\.border-gray-300\s*\{([^}]*)\}/
    )?.[1];

    expect(rule).toContain('color: rgb(var(--ec-page-text));');
    expect(rule).toContain('border-color: rgb(var(--ec-page-border));');
  });
});
