import { buildUrl } from './url-builder';

type BadgeColorKind = 'background' | 'text';

type Badge = {
  backgroundColor?: string;
  textColor?: string;
  url?: string;
};

const ABSOLUTE_OR_PROTOCOL_RELATIVE_URL_PATTERN = /^(?:[a-z][a-z\d+\-.]*:|\/\/)/i;

const isAlreadyBasePrefixed = (url: string) => {
  const baseUrl = import.meta.env.BASE_URL;
  if (!baseUrl || baseUrl === '/') return false;

  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return url === normalizedBaseUrl || url.startsWith(`${normalizedBaseUrl}/`);
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

// Common CSS named colors that callers may use directly (e.g. textColor: "white").
// Palette tokens above take precedence — names like "red" or "blue" resolve to the
// theme-aware token rather than the raw CSS keyword.
const CSS_NAMED_COLORS = new Set([
  'aliceblue',
  'antiquewhite',
  'aqua',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'black',
  'blanchedalmond',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgreen',
  'darkgrey',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'gainsboro',
  'ghostwhite',
  'gold',
  'goldenrod',
  'greenyellow',
  'grey',
  'honeydew',
  'hotpink',
  'indianred',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgreen',
  'lightgrey',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'limegreen',
  'linen',
  'magenta',
  'maroon',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'navy',
  'oldlace',
  'olive',
  'olivedrab',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'plum',
  'powderblue',
  'rebeccapurple',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'silver',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'thistle',
  'tomato',
  'turquoise',
  'wheat',
  'white',
  'whitesmoke',
  'yellowgreen',
]);

const resolveBadgeColor = (color: string | undefined, kind: BadgeColorKind) => {
  if (!color) return undefined;

  const value = color.trim();
  const namedColorKey = value.toLowerCase();

  if (NAMED_BADGE_COLOR_KEYS.has(namedColorKey)) return `rgb(var(--ec-badge-color-${namedColorKey}-${kind}))`;
  if (CSS_COLOR_VALUE_PATTERN.test(value)) return value;
  if (CSS_NAMED_COLORS.has(namedColorKey)) return namedColorKey;

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

export const getBadgeHref = (badge: Badge) => {
  if (!badge.url) return undefined;

  const url = badge.url.trim();
  if (!url) return undefined;
  if (ABSOLUTE_OR_PROTOCOL_RELATIVE_URL_PATTERN.test(url) || url.startsWith('#') || url.startsWith('?')) return url;
  if (isAlreadyBasePrefixed(url)) return url;
  if (url.startsWith('/')) return buildUrl(url);

  return url;
};
