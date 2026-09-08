import fs from 'node:fs/promises';
import path from 'node:path';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import picomatch from 'picomatch';

export type LinkValidationSeverity = 'warn' | 'error' | 'ignore';

export interface LinkValidationOptions {
  onBrokenLinks?: LinkValidationSeverity;
  onBrokenAnchors?: LinkValidationSeverity;
  ignore?: string[];
}

export interface BrokenLink {
  kind: 'link' | 'anchor';
  source: string;
  destination: string;
  suggestion?: string;
}

interface PageLinks {
  source: string;
  baseHref?: string;
  anchors: Set<string>;
  links: Set<string>;
}

interface ValidateLinksOptions extends LinkValidationOptions {
  outDir: string;
  base?: string;
  site?: string;
  format?: 'directory' | 'file' | 'preserve';
  trailingSlash?: 'always' | 'never' | 'ignore';
}

const decodeUrlPart = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    // A literal malformed percent escape can still be an HTML id or filename.
    return value;
  }
};

// Parse HTML rather than searching markup with a regex: attributes can contain
// entities, quoted > characters, or single/unquoted values. Scripts and inert
// template contents must not be mistaken for rendered links or anchor targets.
const readPage = (html: string, source: string): PageLinks => {
  const page: PageLinks = { source, anchors: new Set(), links: new Set() };
  const nodes: DefaultTreeAdapterMap['node'][] = [parse(html)];
  while (nodes.length > 0) {
    const node = nodes.pop()!;
    if ('tagName' in node) {
      const attrs = new Map(node.attrs.map((attr) => [attr.name, attr.value]));
      const id = attrs.get('id');
      if (id) page.anchors.add(id);
      if (node.tagName === 'a' && attrs.get('name')) page.anchors.add(attrs.get('name')!);
      const href = attrs.get('href');
      if (href !== undefined) {
        if (node.tagName === 'base' && page.baseHref === undefined) page.baseHref = href;
        if (node.tagName === 'a' || node.tagName === 'area') page.links.add(href);
      }
    }
    // Reverse the stack so the first <base href> wins in document order.
    if ('childNodes' in node) {
      for (let i = node.childNodes.length - 1; i >= 0; i--) nodes.push(node.childNodes[i]);
    }
  }
  return page;
};

const listFiles = async (root: string, relative = '', files = new Set<string>()): Promise<Set<string>> => {
  for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
    const file = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) await listFiles(root, file, files);
    else if (entry.isFile()) files.add(file);
  }
  return files;
};

const readNavigationLinks = (value: unknown, links: Set<string>) => {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'href' && typeof child === 'string') links.add(child);
    else if (child && typeof child === 'object') readNavigationLinks(child, links);
  }
};

export const validateBuiltLinks = async ({
  outDir,
  base = '/',
  site,
  format = 'directory',
  trailingSlash = 'ignore',
  onBrokenLinks = 'warn',
  onBrokenAnchors = 'warn',
  ignore = [],
}: ValidateLinksOptions): Promise<{ pages: number; diagnostics: BrokenLink[] }> => {
  if (onBrokenLinks === 'ignore' && onBrokenAnchors === 'ignore') return { pages: 0, diagnostics: [] };

  const origin = site ? new URL(site).origin : 'https://eventcatalog.invalid';
  const prefix = new URL(`/${base.replace(/^\/+|\/+$/g, '')}`, origin).pathname.replace(/\/$/, '');
  const withBase = (route: string) => `${prefix}${route}`;
  const files = await listFiles(outDir);
  const pages = new Map<string, PageLinks>();
  const ignored = ignore.map((pattern) => picomatch(pattern, { dot: true }));

  for (const file of [...files].sort()) {
    if (!file.endsWith('.html')) continue;
    let route = `/${file}`;
    if (file === 'index.html') route = '/';
    else if (file.endsWith('/index.html')) route = route.slice(0, -'index.html'.length);
    else if (format !== 'directory') route = route.slice(0, -'.html'.length);
    if (route !== '/' && trailingSlash === 'never') route = route.replace(/\/$/, '');
    else if (format === 'file' && trailingSlash === 'always' && !route.endsWith('/')) route += '/';
    // Encode path segments, not slashes, to handle spaces, # and Unicode in filenames.
    const source = withBase(route.split('/').map(encodeURIComponent).join('/'));
    pages.set(file, readPage(await fs.readFile(path.join(outDir, file), 'utf8'), source));
  }

  const sources = [...pages.values()];
  // This is also used by client-only navigation, so its links aren't necessarily
  // present as <a> elements in any generated HTML page.
  if (files.has('api/sidebar-data.json')) {
    const links = new Set<string>();
    readNavigationLinks(JSON.parse(await fs.readFile(path.join(outDir, 'api/sidebar-data.json'), 'utf8')), links);
    sources.push({
      source: withBase('/api/sidebar-data.json'),
      baseHref: withBase('/'),
      anchors: new Set(),
      links,
    });
  }

  const findFile = (pathname: string): string | undefined => {
    const relative = pathname.replace(/^\/+/, '');
    if (files.has(relative)) return relative;
    const index = path.posix.join(relative, 'index.html');
    if (files.has(index)) return index;
    const html = `${relative.replace(/\/$/, '')}.html`;
    if (format !== 'directory' && files.has(html)) return html;
    return undefined;
  };

  const diagnostics: BrokenLink[] = [];
  for (const page of sources) {
    const sourceUrl = new URL(page.source, origin);
    let documentBase = sourceUrl;
    try {
      if (page.baseHref !== undefined) documentBase = new URL(page.baseHref, sourceUrl);
    } catch {
      // Browsers ignore an invalid base URL and use the document URL instead.
    }
    const seen = new Set<string>();
    for (const href of page.links) {
      let target: URL;
      try {
        target = new URL(href, documentBase);
      } catch {
        if (onBrokenLinks !== 'ignore') diagnostics.push({ kind: 'link', source: page.source, destination: href });
        continue;
      }
      if (!['http:', 'https:'].includes(target.protocol) || target.origin !== origin) continue;
      if (prefix && target.pathname !== prefix && !target.pathname.startsWith(`${prefix}/`)) continue;
      const pathname = target.pathname.slice(prefix.length) || '/';
      // Ignore patterns use paths relative to the catalog base, never filesystem paths.
      if (ignored.some((matches) => matches(pathname))) continue;
      const destination = target.pathname + target.hash;
      if (seen.has(destination)) continue;
      seen.add(destination);

      const decodedPath = decodeUrlPart(pathname);
      const anchor = decodeUrlPart(target.hash.slice(1).split(':~:')[0]);
      const file = findFile(decodedPath);
      if (!file) {
        if (onBrokenLinks === 'ignore') continue;
        // Give a precise suggestion for the common resource-type mixups, but
        // only if the suggested destination actually exists in this build.
        const alternatives = /^\/docs\/(users|teams)\//.test(decodedPath)
          ? ['users', 'teams']
          : /^\/docs\/(events|commands|queries)\//.test(decodedPath)
            ? ['events', 'commands', 'queries']
            : [];
        const suggestion = alternatives
          .map((collection) => decodedPath.replace(/^\/docs\/[^/]+\//, `/docs/${collection}/`))
          .find((route) => findFile(route));
        diagnostics.push({
          kind: 'link',
          source: page.source,
          destination,
          ...(suggestion ? { suggestion: withBase(suggestion) } : {}),
        });
      } else if (onBrokenAnchors !== 'ignore' && anchor && anchor.toLowerCase() !== 'top') {
        const targetPage = pages.get(file);
        // Fragments in PDFs/SVGs and other non-HTML assets have different semantics.
        if (targetPage && !targetPage.anchors.has(anchor)) {
          diagnostics.push({ kind: 'anchor', source: page.source, destination });
        }
      }
    }
  }
  return {
    pages: pages.size,
    diagnostics: diagnostics.sort((a, b) => a.destination.localeCompare(b.destination) || a.source.localeCompare(b.source)),
  };
};

export const formatBrokenLinks = (diagnostics: BrokenLink[]): string => {
  const groups = new Map<string, { diagnostic: BrokenLink; sources: Set<string> }>();
  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.kind}:${diagnostic.destination}`;
    const group = groups.get(key) ?? { diagnostic, sources: new Set<string>() };
    group.sources.add(diagnostic.source);
    groups.set(key, group);
  }
  const lines = [`Found ${groups.size} broken link/anchor destination(s) in ${diagnostics.length} page reference(s).`];
  for (const { diagnostic, sources } of groups.values()) {
    lines.push(`\nBroken ${diagnostic.kind}: ${diagnostic.destination}`);
    for (const source of [...sources].slice(0, 5)) lines.push(`  From: ${source}`);
    if (sources.size > 5) lines.push(`  ...and ${sources.size - 5} more source(s)`);
    if (diagnostic.suggestion) lines.push(`  Possible destination: ${diagnostic.suggestion}`);
  }
  return lines.join('\n');
};
