export interface CatalogNameConfig {
  title?: string | null;
  organizationName?: string | null;
  logo?: {
    text?: string | null;
  } | null;
}

const PRODUCT_NAME = 'EventCatalog';

const normalize = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

/**
 * Name shown for this catalog.
 *
 * `title` wins when it is set to something other than the product-name placeholder.
 * Several scaffolds still ship `title: 'EventCatalog'` while `organizationName` (and
 * sometimes the logo text) carry the name the user chose, so a bare "EventCatalog"
 * is skipped when a more specific name exists.
 */
export const getCatalogName = (config?: CatalogNameConfig | null): string => {
  const candidates = [normalize(config?.title), normalize(config?.organizationName), normalize(config?.logo?.text)].filter(
    (value): value is string => Boolean(value)
  );

  return candidates.find((value) => value !== PRODUCT_NAME) ?? candidates[0] ?? PRODUCT_NAME;
};

/** Page title passed into layouts, with the historical "EventCatalog" homepage placeholder replaced. */
export const resolvePageTitle = (pageTitle: string | null | undefined, catalogName: string): string => {
  const page = pageTitle?.trim();
  if (!page || page === PRODUCT_NAME) return catalogName;
  return page;
};

/** HTML `<title>`: the catalog name, plus the page title when it adds information. */
export const formatDocumentTitle = (pageTitle: string | null | undefined, catalogName: string): string => {
  const page = resolvePageTitle(pageTitle, catalogName);
  if (page === catalogName) return catalogName;
  return `${catalogName} | ${page}`;
};
