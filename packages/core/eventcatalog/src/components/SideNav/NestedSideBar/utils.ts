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
