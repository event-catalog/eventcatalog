/**
 * Configurable URL builder utility
 * Consumers (e.g. Astro adapter) can provide a custom builder via setBuildUrlFn
 * to handle base paths, trailing slashes, etc.
 */

let _customBuildUrl: ((path: string) => string) | null = null;

export function setBuildUrlFn(fn: ((path: string) => string) | null): void {
  _customBuildUrl = fn;
}

export function buildUrl(path: string): string {
  if (_customBuildUrl) {
    return _customBuildUrl(path);
  }
  return path;
}

/**
 * Navigate to a URL, preferring the host app's view-transition router when it's
 * available so navigations are soft/animated rather than a hard page reload.
 *
 * The visualiser package is intentionally decoupled from Astro, so the host
 * (e.g. EventCatalog's VisualiserLayout) bridges its router onto
 * `window.__ecNavigate`. When that bridge isn't present (standalone usage), we
 * fall back to a normal `location.href` assignment.
 *
 * `url` should already be passed through `buildUrl`.
 */
export function navigateTo(url: string): void {
  if (typeof window === "undefined") return;
  const ecNavigate = (
    window as unknown as { __ecNavigate?: (url: string) => void }
  ).__ecNavigate;
  if (typeof ecNavigate === "function") {
    ecNavigate(url);
    return;
  }
  window.location.href = url;
}
