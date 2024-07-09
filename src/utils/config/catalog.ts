import * as config from '@config';

type SideBarItemConfig = {
  visible?: boolean;
};

export type CatalogConfig = {
  docs: {
    sidebar: {
      showPageHeadings?: boolean;
      domains: SideBarItemConfig;
      services: SideBarItemConfig;
      messages: SideBarItemConfig;
      teams: SideBarItemConfig;
      users: SideBarItemConfig;
    };
  };
};

export default config.default;
