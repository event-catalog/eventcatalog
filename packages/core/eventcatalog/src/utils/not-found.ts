/**
 * Helpers for the 404 page. They run in the browser: a static host serves the same 404.html for every missing path,
 * so the page works out what was asked for from the URL.
 */

// Pages under /docs that aren't resources
const NOT_RESOURCE_TYPES = new Set(['custom', 'llm']);

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

/** The path inside the catalog, without its base (e.g. /catalog/docs/... with base /catalog is /docs/...) */
const withoutBase = (pathname: string, baseUrl: string) => {
  const base = trimTrailingSlashes(baseUrl);
  if (!base) return pathname;
  if (pathname === base) return '/';
  return pathname.startsWith(`${base}/`) ? pathname.slice(base.length) : pathname;
};

/**
 * The resource a missing URL belongs to, e.g. /docs/services/OrderService/9.9.9 or /visualiser/services/OrderService,
 * or undefined when the URL isn't a resource page
 */
export const getResourceFromMissingPath = (pathname: string, baseUrl = '/') => {
  const match = withoutBase(pathname, baseUrl).match(/^\/(?:docs|visualiser|architecture)\/([^/]+)\/([^/]+)/);
  if (!match || NOT_RESOURCE_TYPES.has(match[1])) return undefined;
  try {
    return { type: match[1], id: decodeURIComponent(match[2]) };
  } catch {
    return undefined;
  }
};

/**
 * Where the latest version of the resource a missing URL belongs to would be (/docs/{type}/{id}, which sends you on to
 * its latest version), without the base. Undefined when the URL isn't a resource page, or is that page itself (then
 * the resource isn't in the catalog)
 */
export const getLatestVersionSuggestion = (pathname: string, baseUrl = '/') => {
  const resource = getResourceFromMissingPath(pathname, baseUrl);
  if (!resource) return undefined;

  const path = `/docs/${resource.type}/${encodeURIComponent(resource.id)}`;
  if (trimTrailingSlashes(withoutBase(pathname, baseUrl)) === path) return undefined;

  return { id: resource.id, path };
};
