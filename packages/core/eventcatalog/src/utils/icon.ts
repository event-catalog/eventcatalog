import { buildUrl } from '@utils/url-builder';

export function isIconPath(value: string | undefined): value is string {
  if (!value) return false;
  return value.startsWith('/') || value.startsWith('http://') || value.startsWith('https://');
}

export function resolveIconUrl(value: string): string {
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return buildUrl(value, true);
}

export function iconFieldsForResource(
  data: { styles?: { icon?: string } } | undefined,
  defaultIcon: string
): { leftIcon: string } | { icon: string } {
  const styleIcon = data?.styles?.icon;
  return isIconPath(styleIcon) ? { leftIcon: styleIcon } : { icon: defaultIcon };
}

/**
 * Like {@link iconFieldsForResource} but with no default icon: returns the custom
 * `styles.icon` when one is defined, otherwise no icon at all. Used where the
 * surrounding context (a typed section header) already conveys the resource type,
 * so the default per-item icon would be redundant.
 */
export function customIconFieldsForResource(data: { styles?: { icon?: string } } | undefined): { leftIcon: string } | {} {
  const styleIcon = data?.styles?.icon;
  return isIconPath(styleIcon) ? { leftIcon: styleIcon } : {};
}
