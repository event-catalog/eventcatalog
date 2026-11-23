import { buildUrl } from './url-builder';

// Kept free of config and icon imports: the header's client script uses isHeaderNavigationCurrent too.
// The config's shape is typed in packages/core/src/eventcatalog.config.ts (navigation.header); it's read here as unknown.

/** A path that marks a link as current. `exact` paths (the catalog's root) don't count the pages under them */
export type HeaderNavigationMatch = { path: string; exact?: boolean };

export type HeaderNavigationLink = {
  label: string;
  href: string;
  /** Opens in a new tab and is never current */
  external: boolean;
  icon?: string;
  description?: string;
  match: HeaderNavigationMatch[];
};

export type HeaderNavigationSection = {
  label?: string;
  items: HeaderNavigationLink[];
};

export type HeaderNavigationItem =
  | ({ type: 'link' } & HeaderNavigationLink)
  | { type: 'dropdown'; label: string; sections: HeaderNavigationSection[]; match: HeaderNavigationMatch[] };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];
const getScheme = (href: string) => href.match(/^([a-z][a-z\d+.-]*):/i)?.[1].toLowerCase();

/** Links to another site (http(s): or a protocol-relative //host) open in a new tab */
export const isExternalNavigationHref = (href: string) => /^(https?:)?\/\//i.test(href);

/**
 * The href a navigation link is drawn with: catalog paths get the base URL (and trailing slash, before any query or
 * hash); other sites, mailto: and tel: links and #anchors are kept as they are. Other schemes (e.g. javascript:) give null
 */
export const resolveNavigationHref = (href: string): string | null => {
  const scheme = getScheme(href);
  if (scheme) return ALLOWED_SCHEMES.includes(scheme) ? href : null;
  if (href.startsWith('//') || href.startsWith('#')) return href;

  const suffixStart = href.search(/[?#]/);
  if (suffixStart === -1) return buildUrl(href);
  return `${buildUrl(href.slice(0, suffixStart) || '/')}${href.slice(suffixStart)}`;
};

const withoutTrailingSlash = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

// The path a link counts as current under: base URL applied, no query, hash, trailing slash or spaces (the match is
// written to the page space-separated)
const toMatch = (path: string): HeaderNavigationMatch => {
  const matchPath = withoutTrailingSlash(buildUrl(path.split(/[?#]/)[0] || '/', true)).replace(/ /g, '%20');
  // The catalog's root would contain every page, so it only matches itself
  const root = withoutTrailingSlash(buildUrl('/', true));
  return matchPath === root ? { path: matchPath, exact: true } : { path: matchPath };
};

const isCatalogPath = (path: string) => !getScheme(path) && !path.startsWith('//') && !path.startsWith('#');

const resolveLink = (config: unknown): HeaderNavigationLink | null => {
  if (!isRecord(config) || !isNonEmptyString(config.label) || !isNonEmptyString(config.href)) return null;

  const href = resolveNavigationHref(config.href);
  if (!href) return null;

  const external = isExternalNavigationHref(config.href);
  const configuredMatch = (Array.isArray(config.match) ? config.match : [config.match]).filter(
    (path): path is string => isNonEmptyString(path) && isCatalogPath(path)
  );
  // Without usable match paths, a catalog link is current under its own path
  const matchPaths = configuredMatch.length > 0 ? configuredMatch : isCatalogPath(config.href) ? [config.href] : [];

  return {
    label: config.label,
    href,
    external,
    icon: isNonEmptyString(config.icon) ? config.icon : undefined,
    description: isNonEmptyString(config.description) ? config.description : undefined,
    match: matchPaths.map(toMatch),
  };
};

const resolveDropdown = (config: Record<string, unknown> & { items: unknown[] }): HeaderNavigationItem | null => {
  if (!isNonEmptyString(config.label)) return null;

  // Loose links are gathered into one unlabelled section, in the place the first of them appears
  const sections: HeaderNavigationSection[] = [];
  let looseLinks: HeaderNavigationSection | undefined;

  for (const entry of config.items) {
    if (isRecord(entry) && Array.isArray(entry.items)) {
      const items = entry.items.map(resolveLink).filter((link): link is HeaderNavigationLink => link !== null);
      if (items.length > 0) sections.push({ label: isNonEmptyString(entry.label) ? entry.label : undefined, items });
      continue;
    }

    const link = resolveLink(entry);
    if (!link) continue;
    if (!looseLinks) {
      looseLinks = { items: [] };
      sections.push(looseLinks);
    }
    looseLinks.items.push(link);
  }

  if (sections.length === 0) return null;

  return {
    type: 'dropdown',
    label: config.label,
    sections,
    match: sections.flatMap((section) => section.items.flatMap((link) => link.match)),
  };
};

/**
 * Resolves `navigation.header` from eventcatalog.config.js into the links drawn in the header.
 * Entries without a label, or links without a usable href, are left out rather than breaking the header.
 */
export const resolveHeaderNavigation = (config: unknown): HeaderNavigationItem[] => {
  if (!Array.isArray(config)) return [];

  return config
    .map((entry): HeaderNavigationItem | null => {
      if (isRecord(entry) && Array.isArray(entry.items)) {
        return resolveDropdown(entry as Record<string, unknown> & { items: unknown[] });
      }
      const link = resolveLink(entry);
      return link ? { type: 'link', ...link } : null;
    })
    .filter((item): item is HeaderNavigationItem => item !== null);
};

// The path a link's own href counts as current under (its href already has the base URL)
const ownMatchPath = (href: string) => withoutTrailingSlash(href.split(/[?#]/)[0] || '/').replace(/ /g, '%20');

/**
 * A link's match paths as a short attribute value, since the header is in every page's HTML: space-separated, with `=`
 * in front of exact paths (e.g. "/docs/custom =/"). An empty value stands for the link's own path, the usual case, and
 * undefined for a link that's never current (another site)
 */
export const serializeHeaderNavigationMatch = (link: Pick<HeaderNavigationLink, 'href' | 'match'>): string | undefined => {
  if (link.match.length === 0) return undefined;
  const [only] = link.match;
  if (link.match.length === 1 && !only.exact && only.path === ownMatchPath(link.href)) return '';
  return link.match.map((entry) => `${entry.exact ? '=' : ''}${entry.path}`).join(' ');
};

/** Reads a link's match paths back from serializeHeaderNavigationMatch's value and the link's href */
export const parseHeaderNavigationMatch = (value: string, href: string): HeaderNavigationMatch[] => {
  if (value === '') return [{ path: ownMatchPath(href) }];
  return value
    .split(' ')
    .filter(Boolean)
    .map((entry) => (entry.startsWith('=') ? { path: entry.slice(1), exact: true } : { path: entry }));
};

/**
 * Whether a page is in a link's section: 'page' when the page is the link's own path, 'section' when it's under it,
 * or false. Mirrors aria-current's "page" and "true"
 */
export const getHeaderNavigationCurrent = (match: HeaderNavigationMatch[], pathname: string): 'page' | 'section' | false => {
  const path = withoutTrailingSlash(pathname);
  if (match.some((entry) => path === entry.path)) return 'page';
  if (match.some((entry) => !entry.exact && path.startsWith(`${entry.path}/`))) return 'section';
  return false;
};
