import { getCollection } from 'astro:content';
import { buildUrl } from '@utils/url-builder';
import { isVisualiserEnabled } from '@utils/feature';
import {
  getDocsPath,
  getFavorite,
  getSchemaPath,
  getVisualiserPath,
  type ResourceCollection,
  type ResourceRelationship,
} from '@utils/collections/resources';
import type { ResourceItem } from './ResourcesTable';

// Builds the rows of the Resources table, shared by the Resources pages and the Owned Resources pages.

/** `collection:id:version` of every message with an entry in the schemas collection (it has a schema page). */
export const getSchemaKeys = async () =>
  new Set(
    (await getCollection('schemas')).map(
      ({ data: schema }) => `${schema.message.collectionName}:${schema.message.id}:${schema.message.version}`
    )
  );

const withBaseUrl = (path: string | undefined) => (path ? buildUrl(path) : undefined);

export const toResourceItem = (
  collection: ResourceCollection,
  item: any,
  schemaKeys: Set<string>,
  relationship?: ResourceRelationship
): ResourceItem => ({
  collection,
  id: item.data.id,
  name: item.data.name || item.data.id,
  version: item.data.version,
  summary: item.data.summary,
  icon: item.data?.styles?.icon,
  href: buildUrl(getDocsPath(collection, item)),
  visualiserHref: withBaseUrl(getVisualiserPath(collection, item, isVisualiserEnabled())),
  schemaHref: withBaseUrl(getSchemaPath(collection, item, schemaKeys)),
  favorite: getFavorite(collection, item),
  relationship,
});
