// Maps a documentation page to the Markdown version of it (the `.mdx` routes llms.txt links to), so agents can find
// it from the page's <head> and, in server mode, get it from the page's own URL with `Accept: text/markdown`.
// Don't import config here: the layout and the middleware both use this.

// Collections served by /docs/[type]/[id]/[version].md(x). The routes check their collections against this type, so
// a page never links to Markdown its route doesn't serve
export const resourceMarkdownCollections = [
  'agents',
  'events',
  'commands',
  'queries',
  'services',
  'data-products',
  'domains',
  'systems',
  'flows',
  'channels',
  'containers',
  'entities',
] as const;
export type ResourceMarkdownCollection = (typeof resourceMarkdownCollections)[number];

// Collections served by /docs/[type]/[id]/[version]/[docType]/[docId].mdx (the route uses this set)
export const resourceDocMarkdownCollections: ReadonlySet<string> = new Set<ResourceMarkdownCollection>([
  'agents',
  'domains',
  'services',
  'events',
  'commands',
  'queries',
  'flows',
  'containers',
  'channels',
  'entities',
  'data-products',
]);

const resourceCollections: ReadonlySet<string> = new Set(resourceMarkdownCollections);

// Static pages that sit where a version or a doc type would, and have no Markdown version
const reservedVersionSegments = new Set(['changelog', 'resources', 'field-lineage', 'asyncapi', 'spec', 'graphql', 'language']);
const reservedDocTypeSegments = new Set(['asyncapi', 'spec', 'graphql', 'generic', 'examples', 'changelog', 'resources']);

const withoutBase = (pathname: string, base: string) => {
  const normalizedBase = base.replace(/\/+$/, '');
  if (normalizedBase && (pathname === normalizedBase || pathname.startsWith(`${normalizedBase}/`))) {
    return { path: pathname.slice(normalizedBase.length), base: normalizedBase };
  }
  return { path: pathname, base: '' };
};

/** The Markdown URL for a documentation page (keeping the base path), or null when the page has none */
export const getMarkdownPathForPage = (pathname: string, base = '/'): string | null => {
  const { path, base: prefix } = withoutBase(pathname, base);
  // Already Markdown. Other paths with dots (versions like 1.0.0, spec files) are handled by the patterns below
  if (/\.mdx?\/?$/i.test(path)) return null;
  const page = path.replace(/\.html$/, '');

  const segments = page.split('/').filter(Boolean);
  if (segments[0] !== 'docs') return null;

  const toMarkdown = () => `${prefix}/${segments.join('/')}.mdx`;
  const [, type, , version, docType] = segments;

  // /docs/custom/{...path}
  if (type === 'custom') return segments.length > 2 ? toMarkdown() : null;

  // /docs/teams/{id}, /docs/users/{id}
  if (type === 'teams' || type === 'users') return segments.length === 3 ? toMarkdown() : null;

  // The domain language page (/docs/domains/{id}/language) has none: it shows subdomains' terms too, and its
  // language.mdx route only has the domain's own

  // /docs/{type}/{id}/{version}
  if (segments.length === 4 && resourceCollections.has(type) && !reservedVersionSegments.has(version)) return toMarkdown();

  // /docs/{type}/{id}/{version}/{docType}/{docId}
  if (
    segments.length === 6 &&
    resourceDocMarkdownCollections.has(type) &&
    !reservedVersionSegments.has(version) &&
    !reservedDocTypeSegments.has(docType)
  ) {
    return toMarkdown();
  }

  return null;
};

/**
 * The path to rewrite a request to, for `next()` in middleware: the Markdown path without the base path. Under a base
 * path (other than `/`), Astro adds a trailing slash to a rewrite that includes it, and endpoints with an extension
 * never match one, so the rewrite would 404. A path without the base is routed as is, and Astro puts the base back.
 * Null when that path itself starts with the base (e.g. base `/docs`), which Astro would strip again.
 */
export const getMarkdownRewritePath = (markdownPath: string, base = '/'): string | null => {
  const normalizedBase = base.replace(/\/+$/, '');
  if (!normalizedBase) return markdownPath;
  if (!markdownPath.startsWith(`${normalizedBase}/`)) return null;
  const path = markdownPath.slice(normalizedBase.length);
  return path === normalizedBase || path.startsWith(`${normalizedBase}/`) ? null : path;
};

const parseAccept = (accept: string) =>
  accept.split(',').map((part) => {
    const [mediaType, ...params] = part.trim().toLowerCase().split(';');
    const q = params.map((param) => param.trim()).find((param) => param.startsWith('q='));
    const quality = q ? Number.parseFloat(q.slice(2)) : 1;
    return { mediaType: mediaType.trim(), quality: Number.isNaN(quality) ? 1 : quality };
  });

/** True when the Accept header asks for Markdown at least as much as HTML (browsers never send text/markdown) */
export const prefersMarkdown = (accept: string | null | undefined): boolean => {
  if (!accept) return false;
  const types = parseAccept(accept);
  const qualityOf = (mediaType: string) => Math.max(0, ...types.filter((t) => t.mediaType === mediaType).map((t) => t.quality));
  const markdown = qualityOf('text/markdown');
  return markdown > 0 && markdown >= qualityOf('text/html');
};
