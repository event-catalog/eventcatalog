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
