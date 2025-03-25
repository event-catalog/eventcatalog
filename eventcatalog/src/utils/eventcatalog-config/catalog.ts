import * as config from '@config';

type SideBarItemConfig = {
  visible?: boolean;
};

export type CatalogConfig = {
  docs: {
    sidebar: {
      showPageHeadings?: boolean;
      domains?: SideBarItemConfig;
      flows?: SideBarItemConfig;
      services?: SideBarItemConfig;
      messages?: SideBarItemConfig;
      teams?: SideBarItemConfig;
      users?: SideBarItemConfig;
    };
  };
};

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

export default config.default;
