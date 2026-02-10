// Shared utilities for NestedSideBar components

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
    'data product': 'bg-[rgb(var(--ec-badge-data-product-bg))] text-[rgb(var(--ec-badge-data-product-text))]',
  };
  return badgeColors[badge.toLowerCase()] || 'bg-[rgb(var(--ec-badge-default-bg))] text-[rgb(var(--ec-badge-default-text))]';
};
