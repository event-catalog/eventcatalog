import * as config from '@config';
import type { Config } from '../../../../src/eventcatalog.config';

export type CatalogConfig = Config;

const getConfigValue = (obj: any, key: string, defaultValue: any) => {
  return obj?.[key] ?? defaultValue;
};

export const isCollectionVisibleInCatalog = (collection: string) => {
  const sidebarConfig = config?.default?.docs?.sidebar || {};
  const collections = [
    'events',
    'commands',
    'queries',
    'domains',
    'channels',
    'flows',
    'services',
    'teams',
    'users',
    'customDocs',
  ];

  if (!collections.includes(collection)) return false;

  const collectionConfig =
    sidebarConfig[collection === 'events' || collection === 'commands' || collection === 'queries' ? 'messages' : collection];
  return getConfigValue(collectionConfig, 'visible', true);
};

export default config.default as CatalogConfig;
