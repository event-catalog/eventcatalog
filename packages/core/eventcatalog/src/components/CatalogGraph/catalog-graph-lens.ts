export type LensEdgeFilter = {
  edgeLabels?: string[];
  edgeLabelPrefixes?: string[];
};

/** Returns true when a relationship is visible for the configured lens filter. */
export const matchesLensEdgeLabel = (filter: LensEdgeFilter, label: string): boolean => {
  const hasExactLabels = Boolean(filter.edgeLabels?.length);
  const hasPrefixes = Boolean(filter.edgeLabelPrefixes?.length);

  if (!hasExactLabels && !hasPrefixes) return true;

  return Boolean(filter.edgeLabels?.includes(label) || filter.edgeLabelPrefixes?.some((prefix) => label.startsWith(prefix)));
};
