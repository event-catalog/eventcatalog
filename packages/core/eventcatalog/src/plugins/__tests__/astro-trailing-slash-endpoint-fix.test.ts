import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { applyGetParamsTrailingSlashFix } from '../astro-trailing-slash-endpoint-fix';

// From astro 7.0.3 - 7.0.6 (dist/core/render/params-and-props.js)
const GET_PARAMS_7_0_3 = `function getParams(route, pathname) {
  if (!route.params.length) return {};
  const path = pathname.endsWith(".html") && route.type === "page" && !routeHasHtmlExtension(route) ? pathname.slice(0, -5) : pathname;
  const allPatterns = [route, ...route.fallbackRoutes].map((r) => r.pattern);
  const paramsMatch = allPatterns.map((pattern) => pattern.exec(path)).find((x) => x);
  if (!paramsMatch) return {};
}`;

// From astro 7.0.7 - the same line was refactored to use \`let\`
const GET_PARAMS_7_0_7 = `function getParams(route, pathname) {
  if (!route.params.length) return {};
  const hasHtmlSuffix = pathname.endsWith(".html") && !routeHasHtmlExtension(route);
  const path = hasHtmlSuffix && route.type === "page" ? pathname.slice(0, -".html".length) : pathname;
  const allPatterns = [route, ...route.fallbackRoutes].map((r) => r.pattern);
  let paramsMatch = allPatterns.map((pattern) => pattern.exec(path)).find((x) => x);
  if (!paramsMatch) return {};
}`;

describe('astro-trailing-slash-endpoint-fix', () => {
  it('patches the astro 7.0.3-7.0.6 getParams source (const paramsMatch)', () => {
    const patched = applyGetParamsTrailingSlashFix(GET_PARAMS_7_0_3);
    expect(patched).toBeDefined();
    expect(patched).toContain("path.endsWith('/') ? path.slice(0, -1) : path + '/'");
    expect(patched).toContain('let paramsMatch = allPatterns');
  });

  it('patches the astro 7.0.7 getParams source (let paramsMatch)', () => {
    const patched = applyGetParamsTrailingSlashFix(GET_PARAMS_7_0_7);
    expect(patched).toBeDefined();
    expect(patched).toContain("path.endsWith('/') ? path.slice(0, -1) : path + '/'");
  });

  it('returns undefined when the source does not match', () => {
    expect(applyGetParamsTrailingSlashFix('const somethingElse = true;')).toBeUndefined();
  });

  // Canary: if this fails after an astro bump, astro refactored getParams and the
  // fix in ../astro-trailing-slash-endpoint-fix.ts needs updating (or removing, if
  // withastro/astro PR #17224's regression has been fixed upstream).
  it('applies to the installed astro version', () => {
    const require = createRequire(import.meta.url);
    const astroRoot = dirname(require.resolve('astro/package.json'));
    const source = readFileSync(join(astroRoot, 'dist/core/render/params-and-props.js'), 'utf8');
    expect(applyGetParamsTrailingSlashFix(source)).toBeDefined();
  });
});
