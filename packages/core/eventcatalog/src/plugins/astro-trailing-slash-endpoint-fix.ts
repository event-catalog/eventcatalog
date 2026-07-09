import type { Plugin } from 'vite';

// Works around a regression in Astro >= 7.0.4 (withastro/astro PR #17224).
//
// With `trailingSlash: 'always'`, Astro's prerender path generation
// (dist/runtime/prerender/static-paths.js) appends a trailing slash to every
// generated path, including dynamic file endpoints such as
// /docs/teams/[id].md -> /docs/teams/customer-platform.md/. Since 7.0.4 the
// route *pattern* for those endpoints no longer accepts a trailing slash, so
// at render time `getParams` fails to extract any params and static builds
// crash with `TypeError: Missing parameter: id`.
//
// The generation side runs in the Astro CLI process and cannot be patched
// here, but `getParams` (dist/core/render/params-and-props.js) is bundled
// through Vite into the prerender/server entries. This plugin rewrites it to
// retry with the trailing slash flipped when no route pattern matches - a
// no-op on unaffected Astro versions and once the regression is fixed
// upstream.
//
// The regex below matches Astro 7.0.3 (`const paramsMatch`) through 7.0.7
// (`let paramsMatch`). A unit test asserts it still applies to the installed
// Astro version so a future refactor is caught in CI rather than as a broken
// user build.
const GET_PARAMS_PATTERN =
  /(?:const|let)( paramsMatch = allPatterns\.map\(\(pattern\) => pattern\.exec\(path\)\)\.find\(\(x\) => x\);)/;

export const applyGetParamsTrailingSlashFix = (code: string): string | undefined => {
  if (!GET_PARAMS_PATTERN.test(code)) return undefined;
  return code.replace(
    GET_PARAMS_PATTERN,
    `let$1
  if (!paramsMatch) {
    const flipped = path.endsWith('/') ? path.slice(0, -1) : path + '/';
    paramsMatch = allPatterns.map((p) => p.exec(flipped)).find((x) => x);
  }`
  );
};

export const astroTrailingSlashEndpointFix = (): Plugin => ({
  name: 'eventcatalog:astro-trailing-slash-endpoint-fix',
  transform(code, id) {
    if (!id.replace(/\\/g, '/').includes('astro/dist/core/render/params-and-props.js')) return;
    const patched = applyGetParamsTrailingSlashFix(code);
    if (!patched) {
      console.warn(
        '[eventcatalog] Could not apply the Astro trailing-slash endpoint fix; builds with trailingSlash: true may fail. Please raise an issue at https://github.com/event-catalog/eventcatalog/issues'
      );
      return;
    }
    return { code: patched, map: null };
  },
});
