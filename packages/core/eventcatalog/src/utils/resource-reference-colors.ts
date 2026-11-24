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

/**
 * A reference's colours, from its type's colour (`r g b`, or a theme variable such as `var(--ec-accent)`): soft, as
 * Vercel's, so a sentence full of references still reads as text. The text and icon are the type's colour mixed with
 * the page's text colour, by how much each theme takes (--ec-resource-ref-strength in tailwind.css: most of the colour
 * on the light theme, where its near-black text would otherwise darken it to grey; a little less on the dark one), the
 * dotted underline is the type's colour, faint, and the hover background fainter still.
 */
export const getResourceReferenceColors = (rgb: string) => ({
  '--ec-resource-ref-bg': `rgb(${rgb} / 0.1)`,
  '--ec-resource-ref-color': `color-mix(in srgb, rgb(${rgb}) var(--ec-resource-ref-strength, 80%), rgb(var(--ec-page-text)))`,
  '--ec-resource-ref-decoration': `rgb(${rgb} / var(--ec-resource-ref-decoration-alpha, 0.5))`,
});

export const getResourceReferenceStyle = (type: string): string => {
  const rgb = type === 'doc' ? 'var(--ec-accent)' : tailwind500RgbByColor[getResourceReferenceColorName(type)];

  return [
    ...Object.entries(getResourceReferenceColors(rgb)).map(([name, value]) => `${name}: ${value}`),
    'color: var(--ec-resource-ref-color)',
    'text-decoration-color: var(--ec-resource-ref-decoration)',
  ].join('; ');
};
