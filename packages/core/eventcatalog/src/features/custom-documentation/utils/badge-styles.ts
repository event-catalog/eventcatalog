type ThemeBadgeType = 'domain' | 'service' | 'event' | 'command' | 'query' | 'design' | 'channel' | 'default';

const THEME_BADGE_CLASSES: Record<ThemeBadgeType, string> = {
  domain: 'bg-[rgb(var(--ec-badge-domain-bg))] text-[rgb(var(--ec-badge-domain-text))]',
  service: 'bg-[rgb(var(--ec-badge-service-bg))] text-[rgb(var(--ec-badge-service-text))]',
  event: 'bg-[rgb(var(--ec-badge-event-bg))] text-[rgb(var(--ec-badge-event-text))]',
  command: 'bg-[rgb(var(--ec-badge-command-bg))] text-[rgb(var(--ec-badge-command-text))]',
  query: 'bg-[rgb(var(--ec-badge-query-bg))] text-[rgb(var(--ec-badge-query-text))]',
  design: 'bg-[rgb(var(--ec-badge-design-bg))] text-[rgb(var(--ec-badge-design-text))]',
  channel: 'bg-[rgb(var(--ec-badge-channel-bg))] text-[rgb(var(--ec-badge-channel-text))]',
  default: 'bg-[rgb(var(--ec-badge-default-bg))] text-[rgb(var(--ec-badge-default-text))]',
};

const COLOR_TO_THEME_BADGE: Record<string, ThemeBadgeType> = {
  yellow: 'domain',
  amber: 'event',
  orange: 'event',
  red: 'event',
  rose: 'event',
  pink: 'service',
  fuchsia: 'service',
  blue: 'command',
  sky: 'command',
  purple: 'query',
  violet: 'query',
  cyan: 'query',
  teal: 'design',
  green: 'design',
  emerald: 'design',
  lime: 'design',
  indigo: 'channel',
  slate: 'default',
  gray: 'default',
  zinc: 'default',
  neutral: 'default',
  stone: 'default',
};

const getThemeBadgeClasses = (color?: string) => {
  if (!color) return THEME_BADGE_CLASSES.default;
  const key = color.trim().toLowerCase();
  return THEME_BADGE_CLASSES[COLOR_TO_THEME_BADGE[key] || 'default'];
};

export const getCustomDocsSidebarBadgeClasses = (color?: string) => {
  return `ml-2 text-[10px] font-medium px-2 py-0.5 rounded uppercase border border-[rgb(var(--ec-page-border))] ${getThemeBadgeClasses(color)}`;
};

export const getCustomDocsContentBadgeClasses = (color?: string) => {
  return `inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-[rgb(var(--ec-page-border))] ${getThemeBadgeClasses(color)}`;
};
