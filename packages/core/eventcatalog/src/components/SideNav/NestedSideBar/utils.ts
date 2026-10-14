// Shared utilities for NestedSideBar components

import type { ChildRef, NavigationData, NavNode } from '@stores/sidebar-store/state';

export const SIDEBAR_GROUP_COLLAPSE_THRESHOLD = 5;

/**
 * Strip the configured base path from a pathname so URL pattern matching works
 * regardless of the base path setting (e.g. `/eventcatalog/docs/...` → `/docs/...`).
 */
export const stripBasePath = (pathname: string): string => {
  const base = __EC_BASE__.replace(/\/$/, ''); // e.g. '/eventcatalog'
  if (base && pathname.startsWith(base)) {
    return pathname.slice(base.length) || '/';
  }
  return pathname;
};

export type NavigationLevel = {
  key: string | null; // The key of the node that was drilled into (null for root)
  entries: ChildRef[];
  title: string;
  badge?: string; // Category badge (e.g., "Domain", "Service")
};

export const rootLevel = (roots: ChildRef[]): NavigationLevel => ({ key: null, entries: roots, title: 'Documentation' });

/** Resolve a child reference to a node, following unversioned aliases (string → key). */
export const resolveNavRef = (nodes: NavigationData['nodes'], ref: ChildRef): NavNode | null => {
  if (typeof ref !== 'string') return ref;
  const node = nodes[ref];
  if (!node) return null;
  if (typeof node === 'string') return (nodes[node] as NavNode) ?? null;
  return node;
};

/** Map of "type:id" → versioned node key, used to match URLs to nodes. */
export const buildNodeLookup = (nodes: NavigationData['nodes']): Map<string, string> => {
  const lookup = new Map<string, string>();

  Object.entries(nodes).forEach(([key, value]) => {
    // Skip keys that are references (string values pointing to other keys)
    // These are unversioned aliases like "domain:E-Commerce" -> "domain:E-Commerce:1.0.0"
    if (typeof value === 'string') return;

    // Key formats:
    // - "type:id:version" (e.g., "service:OrdersService:0.0.3")
    // - "type:id" (e.g., "user:john", "team:backend") - non-versioned resources
    // - "list:name" (e.g., "list:domains") - skip these
    const parts = key.split(':');

    // Skip list items
    if (parts[0] === 'list') return;

    if (parts.length >= 2) {
      // Store as "type:id"
      lookup.set(`${parts[0]}:${parts[1]}`, key);
    }
  });

  return lookup;
};

/**
 * What the sidebar shows for a URL before it knows the reader's saved drill-down path:
 * the root level on the homepage or for pages without children, otherwise the matching
 * resource's own level (the same "flattened" stack the client falls back to).
 */
export const getStackForUrl = (
  url: string,
  data: NavigationData,
  nodeLookup: ReadonlyMap<string, string> = buildNodeLookup(data.nodes)
): NavigationLevel[] => {
  const root = rootLevel(data.roots);
  if (url === '/' || url === '') return [root];

  const targetKey = findNodeKeyByUrl(url, data.nodes, nodeLookup);
  const target = targetKey ? resolveNavRef(data.nodes, targetKey) : null;
  if (!targetKey || !target?.pages?.length) return [root];

  return [root, { key: targetKey, entries: target.pages, title: target.title, badge: target.badge }];
};

/**
 * Everything the sidebar needs to render one page's level, without the whole catalog: the
 * stack for the URL and only the nodes that level shows (its items, and the contents of its
 * groups). Rendered on the server so the sidebar appears with the HTML, and handed to the
 * island so it keeps showing it until the full navigation data loads.
 */
export type SidebarSnapshot = {
  url: string;
  stack: NavigationLevel[];
  data: NavigationData;
};

const nodeLookupCache = new WeakMap<NavigationData, Map<string, string>>();

export const buildSidebarSnapshot = (data: NavigationData, url: string): SidebarSnapshot => {
  let nodeLookup = nodeLookupCache.get(data);
  if (!nodeLookup) {
    nodeLookup = buildNodeLookup(data.nodes);
    nodeLookupCache.set(data, nodeLookup);
  }

  const stack = getStackForUrl(url, data, nodeLookup);
  const level = stack[stack.length - 1];
  const nodes: NavigationData['nodes'] = {};

  const include = (ref: ChildRef) => {
    if (typeof ref === 'string') {
      if (ref in nodes) return;
      const value = data.nodes[ref];
      if (value === undefined) return;
      nodes[ref] = value;
      if (typeof value === 'string' && data.nodes[value] !== undefined) nodes[value] = data.nodes[value];
    }
    const node = resolveNavRef(data.nodes, ref);
    // Groups render their children inline; items with children only need their own node
    if (node?.type === 'group') node.pages?.forEach(include);
  };

  if (level.key) include(level.key);
  level.entries.forEach(include);

  return { url, stack, data: { roots: data.roots, nodes } };
};

/**
 * The user's overrides of each group's default collapse state, keyed by group id.
 * A group is in at most one set; absence means "use the group's default".
 */
export type SectionCollapsePreferences = {
  expanded: Set<string>;
  collapsed: Set<string>;
};

export const createSectionCollapsePreferences = (
  expanded: Iterable<string> = [],
  collapsed: Iterable<string> = []
): SectionCollapsePreferences => ({
  expanded: new Set(expanded),
  collapsed: new Set(collapsed),
});

/**
 * Whether a group shows a caret and can be toggled. Every group inside a resource's sidebar
 * can collapse (docs-sidebar behaviour); the root catalog level stays open. An explicit
 * `collapsed` (set via sidebar.json) overrides every other rule, including `collapsible: false`.
 */
export const canCollapseGroup = (isTopLevel: boolean, collapsible = true, collapsed?: boolean): boolean => {
  if (collapsed !== undefined) return true;
  return collapsible && !isTopLevel;
};

/**
 * The state a group starts in before the user touches it: an explicit `collapsed` wins,
 * otherwise long lists start collapsed and short ones start open.
 */
export const getDefaultCollapsedState = (childCount: number, collapsed?: boolean): boolean =>
  collapsed ?? childCount > SIDEBAR_GROUP_COLLAPSE_THRESHOLD;

export const isGroupCollapsed = (
  canCollapse: boolean,
  groupId: string,
  preferences: SectionCollapsePreferences,
  defaultCollapsed = true
): boolean => {
  if (!canCollapse) return false;
  if (preferences.expanded.has(groupId)) return false;
  if (preferences.collapsed.has(groupId)) return true;
  return defaultCollapsed;
};

/** Flip a group's state, recording it as an override of its default. */
export const toggleGroupCollapsed = (
  groupId: string,
  preferences: SectionCollapsePreferences,
  defaultCollapsed = true
): SectionCollapsePreferences => {
  const next = createSectionCollapsePreferences(preferences.expanded, preferences.collapsed);
  const isCurrentlyCollapsed = isGroupCollapsed(true, groupId, preferences, defaultCollapsed);
  next.expanded.delete(groupId);
  next.collapsed.delete(groupId);
  if (isCurrentlyCollapsed) next.expanded.add(groupId);
  else next.collapsed.add(groupId);
  return next;
};

/**
 * Finds the sidebar node represented by a resource URL.
 * The URL must have its configured base path removed before it is passed in.
 */
/**
 * Whether an item in a group drops its default per-collection icon because the group heading
 * already conveys its type: every item under a nested group, and items whose icon is the
 * group's own (e.g. events listed under Events). Custom icons (`leftIcon`) always show.
 */
export const hidesDefaultItemIcon = (group: NavNode, item: NavNode, isNested: boolean): boolean =>
  isNested || (!!group.icon && group.icon === item.icon);

export const findNodeKeyByUrl = (
  url: string,
  nodes: Record<string, unknown>,
  nodeLookup: ReadonlyMap<string, string>
): string | null => {
  const urlPatternsWithVersion = [
    // Domains
    { pattern: /^\/docs\/domains\/([^/]+)\/([^/]+)/, type: 'domain' },
    { pattern: /^\/visualiser\/domains\/([^/]+)\/([^/]+)/, type: 'domain' },
    { pattern: /^\/architecture\/domains\/([^/]+)\/([^/]+)/, type: 'domain' },
    // Systems (key prefix is `system`, url segment is `systems`).
    // The visualiser pattern also matches the System Diagram
    // (/visualiser/systems/:id/:version/context) since it is not end-anchored.
    { pattern: /^\/docs\/systems\/([^/]+)\/([^/]+)/, type: 'system' },
    { pattern: /^\/visualiser\/systems\/([^/]+)\/([^/]+)/, type: 'system' },
    { pattern: /^\/architecture\/systems\/([^/]+)\/([^/]+)/, type: 'system' },
    // Agents
    { pattern: /^\/docs\/agents\/([^/]+)\/([^/]+)/, type: 'agent' },
    { pattern: /^\/visualiser\/agents\/([^/]+)\/([^/]+)/, type: 'agent' },
    // Decision Records
    { pattern: /^\/docs\/adrs\/([^/]+)\/([^/]+)/, type: 'adr' },
    // Services
    { pattern: /^\/docs\/services\/([^/]+)\/([^/]+)/, type: 'service' },
    { pattern: /^\/architecture\/services\/([^/]+)\/([^/]+)/, type: 'service' },
    { pattern: /^\/visualiser\/services\/([^/]+)\/([^/]+)/, type: 'service' },
    // Messages (events, commands, queries) - note: keys use singular form
    { pattern: /^\/docs\/events\/([^/]+)\/([^/]+)/, type: 'event' },
    { pattern: /^\/docs\/commands\/([^/]+)\/([^/]+)/, type: 'command' },
    { pattern: /^\/docs\/queries\/([^/]+)\/([^/]+)/, type: 'query' },
    { pattern: /^\/visualiser\/messages\/([^/]+)\/([^/]+)/, type: 'message' },
    { pattern: /^\/visualiser\/events\/([^/]+)\/([^/]+)/, type: 'event' },
    { pattern: /^\/visualiser\/commands\/([^/]+)\/([^/]+)/, type: 'command' },
    { pattern: /^\/visualiser\/queries\/([^/]+)\/([^/]+)/, type: 'query' },
    // Channels
    { pattern: /^\/docs\/channels\/([^/]+)\/([^/]+)/, type: 'channel' },
    { pattern: /^\/visualiser\/channels\/([^/]+)\/([^/]+)/, type: 'channel' },
    // Containers
    { pattern: /^\/docs\/containers\/([^/]+)\/([^/]+)/, type: 'container' },
    { pattern: /^\/visualiser\/containers\/([^/]+)\/([^/]+)/, type: 'container' },
    // Flows
    { pattern: /^\/docs\/flows\/([^/]+)\/([^/]+)/, type: 'flow' },
    { pattern: /^\/visualiser\/flows\/([^/]+)\/([^/]+)/, type: 'flow' },
    // Data Products
    { pattern: /^\/docs\/data-products\/([^/]+)\/([^/]+)/, type: 'data-product' },
    { pattern: /^\/visualiser\/data-products\/([^/]+)\/([^/]+)/, type: 'data-product' },
    // Entities
    { pattern: /^\/docs\/entities\/([^/]+)\/([^/]+)/, type: 'entity' },
  ];

  const urlPatternsWithoutVersion = [{ pattern: /^\/docs\/domains\/([^/]+)\/language/, type: 'domain' }];

  for (const { pattern, type } of urlPatternsWithVersion) {
    const match = url.match(pattern);
    if (match) {
      const id = match[1];
      const version = match[2];
      const keyWithVersion = `${type}:${id}:${version}`;

      if (nodes[keyWithVersion]) return keyWithVersion;

      const foundNodeKey = nodeLookup.get(`${type}:${id}`);
      if (foundNodeKey) return foundNodeKey;
    }
  }

  for (const { pattern, type } of urlPatternsWithoutVersion) {
    const match = url.match(pattern);
    if (match) {
      const foundNodeKey = nodeLookup.get(`${type}:${match[1]}`);
      if (foundNodeKey) return foundNodeKey;
    }
  }

  return null;
};

/**
 * Returns Tailwind classes for badge styling based on badge type.
 * Uses CSS variables from theme.css for proper theming support.
 */
export const getBadgeClasses = (badge: string): string => {
  const badgeColors: Record<string, string> = {
    domain: 'bg-[rgb(var(--ec-badge-domain-bg))] text-[rgb(var(--ec-badge-domain-text))]',
    service: 'bg-[rgb(var(--ec-badge-service-bg))] text-[rgb(var(--ec-badge-service-text))]',
    event: 'bg-[rgb(var(--ec-badge-event-bg))] text-[rgb(var(--ec-badge-event-text))]',
    command: 'bg-[rgb(var(--ec-badge-command-bg))] text-[rgb(var(--ec-badge-command-text))]',
    query: 'bg-[rgb(var(--ec-badge-query-bg))] text-[rgb(var(--ec-badge-query-text))]',
    message: 'bg-[rgb(var(--ec-badge-message-bg))] text-[rgb(var(--ec-badge-message-text))]',
    design: 'bg-[rgb(var(--ec-badge-design-bg))] text-[rgb(var(--ec-badge-design-text))]',
    channel: 'bg-[rgb(var(--ec-badge-channel-bg))] text-[rgb(var(--ec-badge-channel-text))]',
    container: 'bg-[rgb(var(--ec-badge-container-bg))] text-[rgb(var(--ec-badge-container-text))]',
    'data product': 'bg-[rgb(var(--ec-badge-data-product-bg))] text-[rgb(var(--ec-badge-data-product-text))]',
  };
  return badgeColors[badge.toLowerCase()] || 'bg-[rgb(var(--ec-badge-default-bg))] text-[rgb(var(--ec-badge-default-text))]';
};
