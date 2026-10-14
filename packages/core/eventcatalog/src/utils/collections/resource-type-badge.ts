import { getIconForCollection } from '@utils/collections/icons';
import { getResourceTypeLabel } from '@utils/collections/util';

/** A badge naming a resource's type, with its icon (e.g. on a GraphQL schema page, the resource it belongs to) */
export const getResourceTypeBadge = (collection: string) => ({
  textColor: 'gray',
  content: getResourceTypeLabel(collection),
  icon: getIconForCollection(collection),
});
