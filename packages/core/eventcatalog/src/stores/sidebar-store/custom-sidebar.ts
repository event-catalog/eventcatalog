import path from 'node:path';
import type { CollectionEntry } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import { processSpecifications } from '@utils/collections/util';
import type { ResourceCollection, ResourceDocEntry } from '@utils/collections/resource-docs';
import type { NavNode, ChildRef } from './builders/shared';

/**
 * Custom sidebars: an optional `sidebar.json` next to any resource's `index.mdx` — domains,
 * systems, services, agents, events, commands, queries, flows, containers, entities,
 * data products and ADRs. Each builder exposes its own predefined `$tokens` (see the
 * `<Type>SectionKey` union and `DEFAULT_<TYPE>_SECTION_ORDER` in `builders/<type>.ts`).
 *
 * When the file exists it *is* the sidebar — nothing is merged in, nothing is hidden,
 * what's listed is what renders, in that order. The grammar is intentionally tiny:
 *
 *   A section is one of
 *     "$quick-reference"                                   predefined section (kept live)
 *     { "section": "$owners", "title": "Team" }            predefined section, relabelled
 *     { "title": "Runbooks", "icon": "Siren", "pages": [] } a custom group
 *
 *   A page (inside a custom group) is one of
 *     "$quick-reference"                                   the *items* of a predefined section, spliced in
 *     "[[service|OrderService@1.0.0]]"                     a resource (nested sidebar)
 *     "[[doc|guides/sla]]"                                 one of this resource's docs
 *     "[[spec|openapi.yml]]"                               one of this resource's specifications
 *     "[[spec|service/product-api@1.0.0/openapi.yml]]"     another resource's specification
 *     "[[schema|event/product-created@1.0.0]]"             a message's schema page
 *     { "title": "Runbook", "href": "https://..." }        a plain link (external inferred)
 *     { "title": "Runbooks", "pages": [] }                 a nested group (rendered as a subsection)
 *
 *   Any object-form section or group accepts `"collapsed": true | false` — an explicit initial
 *   state that overrides the renderer's size-based heuristic. Users can still toggle it.
 *
 * Splicing is how you extend a predefined section: wrap it in your own group and put
 * your pages before or after the token — placement is just list order.
 *
 * Link titles and hrefs may use `{id}`, `{version}` and `{collection}` placeholders for the
 * resource the sidebar belongs to, e.g. "/visualiser/{collection}/{id}/{version}". Internal
 * hrefs (no protocol) are passed through `buildUrl` so they respect the configured base path.
 */

export type SidebarLink = { title: string; href: string; icon?: string };
export type SidebarCustomGroup = { title: string; icon?: string; collapsed?: boolean; pages: SidebarPageEntry[] };
export type SidebarPageEntry = string | SidebarLink | SidebarCustomGroup;
export type SidebarSectionOverride = { section: string; title?: string; icon?: string; collapsed?: boolean };
export type SidebarSectionEntry = string | SidebarSectionOverride | SidebarCustomGroup;

export type SidebarSpec = {
  $schema?: string;
  sections: SidebarSectionEntry[];
  /** Where the spec came from — used in error messages only. */
  sourcePath?: string;
};

/**
 * The predefined sections a builder exposes for a resource, keyed by token (without the `$`).
 * Values are what the builder would normally render: null/false/undefined when the section
 * has nothing to show, or an array for tokens that expand to several groups (e.g. resource groups).
 */
export type SidebarSections = Record<string, NavNode | NavNode[] | null | undefined | false>;

export type CustomSidebarResource = {
  /** The Astro collection name, e.g. `domains`, `services`, `events`, `adrs`. */
  collection: ResourceCollection | string;
  id: string;
  version: string;
  /** The resource's own collection entry — needed to resolve its own `[[spec|…]]` refs. */
  entry?: { data: Record<string, any> };
};

type EntryLike = { collection: string; data: Record<string, any> };

export type CustomSidebarContext = {
  resourceDocs?: ResourceDocEntry[];
  domains?: EntryLike[];
  services?: EntryLike[];
  events?: EntryLike[];
  commands?: EntryLike[];
  queries?: EntryLike[];
  schemas?: Array<{ data: { message: { collectionName: string; id: string; version: string } } }>;
};

/** `[type/]id[@version]` — the resource half of a spec or schema ref. */
const parseResourceLocator = (value: string): { type?: string; id: string; version?: string } => {
  let rest = value.trim();
  let type: string | undefined;
  const slash = rest.indexOf('/');
  if (slash !== -1) {
    type = rest.slice(0, slash).toLowerCase();
    rest = rest.slice(slash + 1);
  }
  const at = rest.lastIndexOf('@');
  if (at > 0 && /^[\d.]+$/.test(rest.slice(at + 1))) {
    return { type, id: rest.slice(0, at), version: rest.slice(at + 1) };
  }
  return { type, id: rest };
};

const SPEC_OWNER_COLLECTIONS: Record<string, keyof CustomSidebarContext> = {
  domain: 'domains',
  service: 'services',
};

const SPEC_ROUTES: Record<string, { segment: string; icon: string }> = {
  openapi: { segment: 'spec', icon: '/icons/openapi-black.svg' },
  asyncapi: { segment: 'asyncapi', icon: '/icons/asyncapi-black.svg' },
  graphql: { segment: 'graphql', icon: '/icons/graphql-black.svg' },
};

const MESSAGE_COLLECTIONS: Record<string, keyof CustomSidebarContext> = {
  event: 'events',
  command: 'commands',
  query: 'queries',
};

const RESOURCE_REF_PATTERN = /^\[\[([a-z-]+)\|([^[\]]+?)\]\]$/;
const EXTERNAL_HREF_PATTERN = /^[a-z][a-z0-9+.-]*:/i; // any protocol: https:, mailto:, slack:, ...
const PLACEHOLDER_PATTERN = /\{(id|version|collection)\}/g;

/** Replace `{id}`, `{version}` and `{collection}` with the owning resource's values. */
export const interpolateResourcePlaceholders = (value: string, resource: CustomSidebarResource): string =>
  value.replace(PLACEHOLDER_PATTERN, (_match, key: 'id' | 'version' | 'collection') => resource[key]);

/**
 * Maps `[[type|...]]` ref types to the node-key prefix used in the sidebar node map
 * (see state.ts). Messages are keyed by their singular type (`event:`, `command:`, `query:`).
 */
const REF_TYPE_TO_NODE_PREFIX: Record<string, string> = {
  domain: 'domain',
  system: 'system',
  service: 'service',
  agent: 'agent',
  flow: 'flow',
  container: 'container',
  entity: 'entity',
  channel: 'channel',
  diagram: 'diagram',
  team: 'team',
  user: 'user',
  'data-product': 'data-product',
  adr: 'adr',
  event: 'event',
  command: 'command',
  query: 'query',
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const describeSource = (spec: SidebarSpec) => (spec.sourcePath ? ` (${spec.sourcePath})` : '');

const formatTokenList = (sections: SidebarSections) =>
  Object.keys(sections)
    .map((key) => `$${key}`)
    .join(', ');

export const parseResourceRef = (value: string): { type: string; id: string; version?: string } | null => {
  const match = value.trim().match(RESOURCE_REF_PATTERN);
  if (!match) return null;

  const type = match[1].trim().toLowerCase();
  let id = match[2].trim();
  let version: string | undefined;

  // Docs and specs are addressed by path and carry any version mid-string, not at the end.
  if (type !== 'doc' && type !== 'spec') {
    const versionMatch = id.match(/^(.*)@([\d.]+)$/);
    if (versionMatch) {
      id = versionMatch[1].trim();
      version = versionMatch[2];
    }
  }

  return { type, id, version };
};

const resolveDocPage = (
  ref: { id: string },
  resource: CustomSidebarResource,
  context: CustomSidebarContext,
  spec: SidebarSpec
): NavNode => {
  const [docType, ...rest] = ref.id.split('/');
  const docId = rest.join('/');

  if (!docType || !docId) {
    throw new Error(
      `Invalid doc reference "[[doc|${ref.id}]]" in sidebar${describeSource(spec)}. Expected "[[doc|<type>/<id>]]", e.g. "[[doc|guides/onboarding]]".`
    );
  }

  const doc = (context.resourceDocs || []).find(
    (entry) =>
      entry.data.resourceCollection === resource.collection &&
      entry.data.resourceId === resource.id &&
      entry.data.resourceVersion === resource.version &&
      entry.data.type === docType &&
      entry.data.id === docId
  );

  return {
    type: 'item',
    title: doc?.data.title || docId,
    href: buildUrl(
      `/docs/${resource.collection}/${resource.id}/${resource.version}/${encodeURIComponent(docType)}/${encodeURIComponent(docId)}`
    ),
  };
};

const findEntry = (collections: Array<EntryLike[] | undefined>, id: string, version?: string): EntryLike | undefined => {
  for (const collection of collections) {
    const match = (collection || []).find(
      (entry) => entry.data.id === id && (version === undefined || entry.data.version === version)
    );
    if (match) return match;
  }
  return undefined;
};

/**
 * `[[spec|<filename>]]` (this resource) or `[[spec|[type/]<id>[@version]/<filename>]]` (any resource).
 */
const resolveSpecPage = (
  target: string,
  resource: CustomSidebarResource,
  context: CustomSidebarContext,
  spec: SidebarSpec
): NavNode => {
  const lastSlash = target.lastIndexOf('/');
  const filename = lastSlash === -1 ? target : target.slice(lastSlash + 1);
  const locator = lastSlash === -1 ? null : parseResourceLocator(target.slice(0, lastSlash));

  let owner: { collection: string; id: string; version: string; data: Record<string, any> } | undefined;
  if (!locator) {
    if (resource.entry)
      owner = { collection: resource.collection, id: resource.id, version: resource.version, data: resource.entry.data };
  } else {
    if (locator.type && !SPEC_OWNER_COLLECTIONS[locator.type]) {
      throw new Error(
        `Unknown resource type "${locator.type}" in "[[spec|${target}]]" in sidebar${describeSource(spec)}. Specifications belong to: ${Object.keys(SPEC_OWNER_COLLECTIONS).join(', ')}.`
      );
    }
    const pools = locator.type
      ? [context[SPEC_OWNER_COLLECTIONS[locator.type]] as EntryLike[] | undefined]
      : [context.services, context.domains];
    const entry = findEntry(pools, locator.id, locator.version);
    if (entry) owner = { collection: entry.collection, id: entry.data.id, version: entry.data.version, data: entry.data };
  }

  if (!owner) {
    throw new Error(
      `Cannot resolve "[[spec|${target}]]" in sidebar${describeSource(spec)}: resource${locator ? ` "${locator.id}"` : ''} not found.`
    );
  }

  const wanted = filename.replace(/\.[^.]+$/, '');
  const specification = processSpecifications(owner.data.specifications).find(
    (candidate) => candidate.filename === filename || candidate.filenameWithoutExtension === wanted
  );
  const route = specification && SPEC_ROUTES[specification.type];
  if (!specification || !route) {
    throw new Error(
      `Cannot resolve "[[spec|${target}]]" in sidebar${describeSource(spec)}: "${owner.id}" has no specification file "${filename}".`
    );
  }

  return {
    type: 'item',
    title: specification.name,
    leftIcon: route.icon,
    href: buildUrl(
      `/docs/${owner.collection}/${owner.id}/${owner.version}/${route.segment}/${specification.filenameWithoutExtension}`
    ),
  };
};

/**
 * `[[schema|[type/]<message id>[@version]]]` — a message's schema page.
 */
const resolveSchemaPage = (target: string, context: CustomSidebarContext, spec: SidebarSpec): NavNode => {
  const locator = parseResourceLocator(target);
  if (locator.type && !MESSAGE_COLLECTIONS[locator.type]) {
    throw new Error(
      `Unknown message type "${locator.type}" in "[[schema|${target}]]" in sidebar${describeSource(spec)}. Schemas belong to: ${Object.keys(MESSAGE_COLLECTIONS).join(', ')}.`
    );
  }

  const pools = locator.type
    ? [context[MESSAGE_COLLECTIONS[locator.type]] as EntryLike[] | undefined]
    : [context.events, context.commands, context.queries];
  const message = findEntry(pools, locator.id);
  if (!message) {
    throw new Error(
      `Cannot resolve "[[schema|${target}]]" in sidebar${describeSource(spec)}: message "${locator.id}" not found.`
    );
  }

  const version = locator.version || message.data.version;
  if (context.schemas) {
    const hasSchema = context.schemas.some(
      (schema) =>
        schema.data.message.collectionName === message.collection &&
        schema.data.message.id === message.data.id &&
        schema.data.message.version === version
    );
    if (!hasSchema) {
      throw new Error(
        `Cannot resolve "[[schema|${target}]]" in sidebar${describeSource(spec)}: "${message.data.id}" v${version} has no schema.`
      );
    }
  }

  return {
    type: 'item',
    title: `${message.data.name || message.data.id} schema`,
    href: buildUrl(`/schemas/${message.collection}/${message.data.id}/${version}`),
  };
};

/**
 * `$token` inside a group's pages splices in the predefined section's items
 * (not the section itself), so users can extend a section with their own pages.
 */
const splicePredefinedSectionPages = (token: string, sections: SidebarSections, spec: SidebarSpec): ChildRef[] => {
  const nodes = resolvePredefinedSection(token, {}, sections, spec);
  if (nodes.length > 1) {
    throw new Error(
      `Cannot splice "${token}" into a group in sidebar${describeSource(spec)} because it expands to several groups. Use it as a top-level section instead.`
    );
  }
  return nodes.flatMap((node) => node.pages || []);
};

const isNestedGroup = (page: SidebarPageEntry): page is SidebarCustomGroup => typeof page !== 'string' && 'pages' in page;

const resolvePage = (
  page: SidebarPageEntry,
  sections: SidebarSections,
  resource: CustomSidebarResource,
  context: CustomSidebarContext,
  spec: SidebarSpec,
  parentKey: string
): ChildRef[] => {
  if (isNestedGroup(page)) {
    return [resolveCustomGroup(page, sections, resource, context, spec, parentKey)];
  }

  if (typeof page !== 'string') {
    const href = interpolateResourcePlaceholders(page.href, resource);
    const isExternal = EXTERNAL_HREF_PATTERN.test(href);
    return [
      {
        type: 'item',
        title: interpolateResourcePlaceholders(page.title, resource),
        href: isExternal ? href : buildUrl(href),
        ...(page.icon ? { icon: page.icon } : {}),
        ...(isExternal ? { external: true } : {}),
      },
    ];
  }

  if (page.startsWith('$')) {
    return splicePredefinedSectionPages(page, sections, spec);
  }

  const ref = parseResourceRef(page);
  if (!ref) {
    throw new Error(
      `Invalid page "${page}" in sidebar${describeSource(spec)}. Pages must be a predefined section like "$quick-reference", a resource reference like "[[service|OrderService]]", a doc reference like "[[doc|guides/onboarding]]", or a link { "title", "href" }.`
    );
  }

  if (ref.type === 'doc') {
    return [resolveDocPage(ref, resource, context, spec)];
  }
  if (ref.type === 'spec') {
    return [resolveSpecPage(ref.id, resource, context, spec)];
  }
  if (ref.type === 'schema') {
    return [resolveSchemaPage(ref.version ? `${ref.id}@${ref.version}` : ref.id, context, spec)];
  }

  const prefix = REF_TYPE_TO_NODE_PREFIX[ref.type];
  if (!prefix) {
    throw new Error(
      `Unknown resource type "${ref.type}" in "${page}" in sidebar${describeSource(spec)}. Supported types: ${Object.keys(REF_TYPE_TO_NODE_PREFIX).join(', ')}, doc, spec, schema.`
    );
  }

  // Unversioned keys are aliases to the latest version in the node map.
  return [ref.version ? `${prefix}:${ref.id}:${ref.version}` : `${prefix}:${ref.id}`];
};

const resolvePredefinedSection = (
  token: string,
  overrides: { title?: string; icon?: string; collapsed?: boolean },
  sections: SidebarSections,
  spec: SidebarSpec
): NavNode[] => {
  if (!token.startsWith('$')) {
    throw new Error(
      `Unknown section "${token}" in sidebar${describeSource(spec)}. Predefined sections start with "$" — did you mean "$${token}"?`
    );
  }

  const key = token.slice(1);
  if (!(key in sections)) {
    throw new Error(
      `Unknown section "${token}" in sidebar${describeSource(spec)}. Available sections for this resource: ${formatTokenList(sections)}.`
    );
  }

  const value = sections[key];
  if (!value) return [];

  const nodes = Array.isArray(value) ? value : [value];
  const hasOverrides = overrides.title !== undefined || overrides.icon !== undefined || overrides.collapsed !== undefined;
  if (!hasOverrides) return nodes;

  return nodes.map((node) => ({
    ...node,
    ...(overrides.title !== undefined ? { title: overrides.title } : {}),
    ...(overrides.icon !== undefined ? { icon: overrides.icon } : {}),
    ...(overrides.collapsed !== undefined ? { collapsed: overrides.collapsed } : {}),
  }));
};

/**
 * `parentKey` is the collapseKey of the enclosing group ('' at the top level); nested groups
 * extend it so collapse state is persisted per path. Nested groups render as subtle
 * subsections, matching the built-in Resources > Services/Entities look.
 */
const resolveCustomGroup = (
  group: SidebarCustomGroup,
  sections: SidebarSections,
  resource: CustomSidebarResource,
  context: CustomSidebarContext,
  spec: SidebarSpec,
  parentKey = ''
): NavNode => {
  const collapseKey = parentKey
    ? `${parentKey}:${slugify(group.title)}`
    : `custom:${resource.collection}:${resource.id}:${resource.version}:${slugify(group.title)}`;

  return {
    type: 'group',
    title: group.title,
    ...(group.icon ? { icon: group.icon } : {}),
    ...(parentKey ? { subtle: true } : {}),
    ...(group.collapsed !== undefined ? { collapsed: group.collapsed } : {}),
    collapseKey,
    pages: group.pages.flatMap((page) => resolvePage(page, sections, resource, context, spec, collapseKey)),
  };
};

/**
 * Turn a sidebar spec into the `pages` of a resource node. Throws on anything it can't
 * resolve so a typo fails the build with a pointer at the offending file.
 */
export const applyCustomSidebar = (
  spec: SidebarSpec,
  sections: SidebarSections,
  resource: CustomSidebarResource,
  context: CustomSidebarContext = {}
): ChildRef[] => {
  return spec.sections.flatMap((entry): ChildRef[] => {
    if (typeof entry === 'string') {
      return resolvePredefinedSection(entry, {}, sections, spec);
    }
    if ('section' in entry) {
      return resolvePredefinedSection(
        entry.section,
        { title: entry.title, icon: entry.icon, collapsed: entry.collapsed },
        sections,
        spec
      );
    }
    return [resolveCustomGroup(entry, sections, resource, context, spec)];
  });
};

/**
 * Everything a builder needs to turn its named sections into a node's `pages`.
 * With a `sidebar` spec the spec decides; without one the builder's default order does.
 */
export type ResolveSidebarPagesOptions = {
  sidebar?: SidebarSpec;
  resource: CustomSidebarResource;
  context: CustomSidebarContext;
};

/**
 * Builders produce a map of named sections plus a default order. This turns that into the
 * node's `pages`, either by applying a custom `sidebar.json` or by walking the default order.
 * Sections that are null/false/empty render nothing in both modes.
 */
export const resolveSidebarPages = <K extends string>(
  sections: Record<K, NavNode | NavNode[] | null | undefined | false>,
  defaultOrder: K[],
  { sidebar, resource, context }: ResolveSidebarPagesOptions
): ChildRef[] => {
  if (sidebar) return applyCustomSidebar(sidebar, sections as SidebarSections, resource, context);
  return defaultOrder.flatMap((key) => {
    const value = sections[key];
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  });
};

/**
 * Pick the collections a custom sidebar can reference out of the builders' shared context.
 * Builders pass their `ResourceGroupContext` here rather than spreading it by hand.
 */
export const toCustomSidebarContext = (context: {
  resourceDocs?: ResourceDocEntry[];
  domains?: unknown[];
  services?: unknown[];
  events?: unknown[];
  commands?: unknown[];
  queries?: unknown[];
  schemas?: unknown[];
}): CustomSidebarContext => ({
  resourceDocs: context.resourceDocs,
  domains: context.domains as EntryLike[] | undefined,
  services: context.services as EntryLike[] | undefined,
  events: context.events as EntryLike[] | undefined,
  commands: context.commands as EntryLike[] | undefined,
  queries: context.queries as EntryLike[] | undefined,
  schemas: context.schemas as CustomSidebarContext['schemas'],
});

/**
 * Index sidebar.json entries by the folder they live in, so a resource can look up
 * its sidebar via `path.dirname(resource.filePath)`. The lookup is folder-keyed with no
 * collection check: every sidebar-aware resource lives in its own folder (`index.mdx`), so
 * two resources can never share a key. Sibling files like `ubiquitous-language.mdx` and
 * `changelog.md` are not sidebar-aware and never perform this lookup.
 */
export const indexSidebarsByFolder = (entries: CollectionEntry<'sidebars'>[]): Map<string, SidebarSpec> => {
  const byFolder = new Map<string, SidebarSpec>();
  for (const entry of entries) {
    if (!entry.filePath) continue;
    byFolder.set(path.dirname(entry.filePath), { ...(entry.data as SidebarSpec), sourcePath: entry.filePath });
  }
  return byFolder;
};

export const getSidebarForResource = (
  sidebarsByFolder: Map<string, SidebarSpec>,
  resource: { filePath?: string }
): SidebarSpec | undefined => {
  if (!resource.filePath) return undefined;
  const folder = path.dirname(resource.filePath);
  const exact = sidebarsByFolder.get(folder);
  if (exact) return exact;

  // A versioned copy (…/OrderCreated/versioned/1.0.0/index.mdx) inherits the resource
  // folder's sidebar.json unless its own versioned folder carries one, so both versions of
  // a resource render the same structure. Version-specific links still resolve correctly:
  // predefined sections are built per version and `{version}` placeholders interpolate it.
  const versionedMatch = folder.match(/^(.*)\/versioned\/[^/]+$/);
  return versionedMatch ? sidebarsByFolder.get(versionedMatch[1]) : undefined;
};
