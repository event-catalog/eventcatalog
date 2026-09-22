import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getAstroConfigPath } from '../astro-config-path';

describe('Astro configuration paths', () => {
  it('passes a project-relative path without escaping spaces for the shell', () => {
    expect(getAstroConfigPath('/catalogs/my catalog', '/packages/core/eventcatalog/astro.config.mjs', path.posix)).toBe(
      '../../packages/core/eventcatalog/astro.config.mjs'
    );
  });

  it('normalizes same-drive Windows paths for the Astro CLI', () => {
    expect(getAstroConfigPath('C:\\catalogs\\my catalog', 'C:\\packages\\core\\eventcatalog\\astro.config.mjs', path.win32)).toBe(
      '../../packages/core/eventcatalog/astro.config.mjs'
    );
  });

  it('rejects cross-drive Windows configurations with an actionable error', () => {
    expect(() => getAstroConfigPath('D:\\catalog', 'C:\\packages\\core\\astro.config.mjs', path.win32)).toThrow(
      'EventCatalog cannot load its Astro configuration across filesystem drives. Install or link @eventcatalog/core on the same drive as the catalog.'
    );
  });

  it('rejects configurations on a different UNC share', () => {
    expect(() => getAstroConfigPath('\\\\host\\catalogs\\catalog', '\\\\host\\packages\\astro.config.mjs', path.win32)).toThrow(
      'EventCatalog cannot load its Astro configuration across filesystem drives.'
    );
  });
});
