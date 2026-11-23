import { createHash } from 'node:crypto';
import { buildUrl } from '@utils/url-builder';

export type BannerType = 'info' | 'warning' | 'danger';

/** The catalog's `banner` config, ready to draw */
export interface Banner {
  /** What the visitor's dismissal is saved under: a new message shows again */
  id: string;
  message: string;
  link?: { label: string; href: string };
  type: BannerType;
  dismissible: boolean;
}

interface BannerConfig {
  banner?: {
    id?: unknown;
    message?: unknown;
    link?: { label?: unknown; href?: unknown };
    type?: unknown;
    dismissible?: unknown;
  };
}

const BANNER_TYPES: readonly BannerType[] = ['info', 'warning', 'danger'];

const isBannerType = (value: unknown): value is BannerType =>
  typeof value === 'string' && (BANNER_TYPES as readonly string[]).includes(value);

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

// Links to the catalog's own pages get its base path; links elsewhere (https:, mailto:, a protocol-relative //host or
// a #fragment on the current page) are left as they are. Other schemes (javascript:, data:) aren't links: null
const resolveHref = (href: string): string | null => {
  const scheme = href.match(/^([a-z][a-z\d+.-]*):/i)?.[1].toLowerCase();
  if (scheme) return ['http', 'https', 'mailto'].includes(scheme) ? href : null;
  if (href.startsWith('//') || href.startsWith('#')) return href;
  // The base path and trailing slash go on the path, before any ?query or #fragment
  const suffixAt = href.search(/[?#]/);
  return suffixAt === -1 ? buildUrl(href) : buildUrl(href.slice(0, suffixAt)) + href.slice(suffixAt);
};

/** The banner across the top of every page, or null when the catalog has no message to show */
export const getBanner = (config: BannerConfig | undefined): Banner | null => {
  const banner = config?.banner;
  const message = nonEmptyString(banner?.message);
  if (!message) return null;

  const label = nonEmptyString(banner?.link?.label);
  const href = nonEmptyString(banner?.link?.href);
  const resolvedHref = href ? resolveHref(href) : null;
  const link = label && resolvedHref ? { label, href: resolvedHref } : undefined;

  // Without an id, the message and link are the id, so changing either shows the banner to visitors who dismissed it
  const id =
    nonEmptyString(banner?.id) ??
    createHash('sha256')
      .update(JSON.stringify([message, label, href]))
      .digest('hex')
      .slice(0, 12);

  return {
    id,
    message,
    link,
    type: isBannerType(banner?.type) ? banner.type : 'info',
    dismissible: banner?.dismissible !== false,
  };
};
