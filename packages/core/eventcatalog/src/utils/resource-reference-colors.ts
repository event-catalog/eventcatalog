import { getColorForCollection, tailwind500RgbByColor, type CollectionColor } from './collection-colors';
import { resourceToCollectionMap } from './collections/util';

export type ResourceReferenceType =
  | 'agent'
  | 'entity'
  | 'service'
  | 'event'
  | 'command'
  | 'query'
  | 'domain'
  | 'flow'
  | 'channel'
  | 'diagram'
  | 'container'
  | 'user'
  | 'team'
  | 'doc'
  | 'data-product';

const resourceTypeToCollection = {
  ...resourceToCollectionMap,
  doc: 'customPages',
} as Record<ResourceReferenceType, string>;

export const getResourceReferenceColorName = (type: string): CollectionColor => {
  const collection = resourceTypeToCollection[type as ResourceReferenceType] || '';
  return getColorForCollection(collection);
};

export const getResourceReferenceStyle = (type: string): string => {
  if (type === 'doc') {
    return [
      '--ec-resource-ref-bg: rgb(var(--ec-accent) / 0.12)',
      '--ec-resource-ref-color: rgb(var(--ec-accent))',
      'color: var(--ec-resource-ref-color)',
      'text-decoration-color: var(--ec-resource-ref-color)',
    ].join('; ');
  }

  const color = getResourceReferenceColorName(type);
  const rgb = tailwind500RgbByColor[color];

  return [
    `--ec-resource-ref-bg: rgb(${rgb} / 0.12)`,
    `--ec-resource-ref-color: rgb(${rgb})`,
    'color: var(--ec-resource-ref-color)',
    'text-decoration-color: var(--ec-resource-ref-color)',
  ].join('; ');
};
