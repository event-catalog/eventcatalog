type BadgeColorKind = 'background' | 'text';

type Badge = {
  backgroundColor?: string;
  textColor?: string;
};

const NAMED_BADGE_COLOR_KEYS = new Set([
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]);

const CSS_COLOR_VALUE_PATTERN =
  /^(#[0-9a-f]{3,8}|(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)\(.+\)|var\(--[a-z0-9-_]+\)|transparent|currentColor)$/i;

const resolveBadgeColor = (color: string | undefined, kind: BadgeColorKind) => {
  if (!color) return undefined;

  const value = color.trim();
  const namedColorKey = value.toLowerCase();

  if (NAMED_BADGE_COLOR_KEYS.has(namedColorKey)) return `rgb(var(--ec-badge-color-${namedColorKey}-${kind}))`;
  if (CSS_COLOR_VALUE_PATTERN.test(value)) return value;

  return undefined;
};

export const getBadgeStyle = (badge: Badge) => {
  const backgroundColor = resolveBadgeColor(badge.backgroundColor, 'background');
  const color = resolveBadgeColor(badge.textColor, 'text');

  return [backgroundColor ? `background-color: ${backgroundColor};` : '', color ? `color: ${color};` : '']
    .filter(Boolean)
    .join(' ');
};

export const getBadgeReactStyle = (badge: Badge) => {
  const backgroundColor = resolveBadgeColor(badge.backgroundColor, 'background');
  const color = resolveBadgeColor(badge.textColor, 'text');

  return {
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(color ? { color } : {}),
  };
};
