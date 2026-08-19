// Shared utilities for NestedSideBar components

export const SIDEBAR_GROUP_COLLAPSE_THRESHOLD = 5;
const GROUP_TITLES_WITHOUT_COUNT = new Set(['Quick Reference', 'Architecture', 'Resources']);

export type SectionCollapsePreferences = {
  expanded: Set<string>;
};

export const canCollapseGroup = (childCount: number, isTopLevel: boolean): boolean =>
  !isTopLevel && childCount > SIDEBAR_GROUP_COLLAPSE_THRESHOLD;

export const getGroupLabel = (title: string, childCount: number): string =>
  GROUP_TITLES_WITHOUT_COUNT.has(title) ? title : `${title} (${childCount})`;

export const isGroupCollapsed = (canCollapse: boolean, groupId: string, preferences: SectionCollapsePreferences): boolean => {
  return canCollapse && !preferences.expanded.has(groupId);
};

/**
 * Finds the sidebar node represented by a resource URL.
 * The URL must have its configured base path removed before it is passed in.
 */
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
