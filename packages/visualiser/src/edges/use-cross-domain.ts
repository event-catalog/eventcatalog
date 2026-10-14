/** Class on the path and label of an edge to or from another domain */
export const CROSS_DOMAIN_CLASS = "ec-cross-domain";

/**
 * Whether an edge is part of cross-domain communication (`data.crossDomain`,
 * set when the graph is built), to highlight it.
 */
export const isCrossDomain = (data?: object) =>
  !!(data as { crossDomain?: boolean } | undefined)?.crossDomain;
