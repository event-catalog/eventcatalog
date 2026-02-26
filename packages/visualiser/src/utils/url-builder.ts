/**
 * Configurable URL builder utility
 * Consumers (e.g. Astro adapter) can provide a custom builder via setBuildUrlFn
 * to handle base paths, trailing slashes, etc.
 */

let _customBuildUrl: ((path: string) => string) | null = null;

export function setBuildUrlFn(fn: (path: string) => string): void {
  _customBuildUrl = fn;
}

export function buildUrl(path: string): string {
  if (_customBuildUrl) {
    return _customBuildUrl(path);
  }
  return path;
}
