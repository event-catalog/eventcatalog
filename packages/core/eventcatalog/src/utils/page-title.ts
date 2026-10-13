import config from '@config';

/** The catalog's name: `title` in eventcatalog.config.js, or EventCatalog when it has none */
export const getCatalogTitle = (): string => config?.title?.trim() || 'EventCatalog';

/**
 * A page's title, as browser tabs and link previews show it: the page's own title, then the
 * catalog's (`Domains | Ordering | Acme Inc`), so tabs show the page first. A page without a title
 * of its own (the homepage) is just the catalog's.
 */
export const formatPageTitle = (title?: string): string => {
  const catalogTitle = getCatalogTitle();
  const pageTitle = title?.trim();
  return pageTitle && pageTitle !== catalogTitle ? `${pageTitle} | ${catalogTitle}` : catalogTitle;
};
