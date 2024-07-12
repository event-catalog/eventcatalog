type SideBarConfig = {
  visible: boolean;
};

export interface Config {
  title: string;
  tagline: false;
  organizationName: string;
  homepageLink: string;
  editUrl: string;
  base?: string;
  trailingSlash?: boolean;
  logo?: {
    alt: string;
    src: string;
    text?: string;
  };
  docs: {
    sidebar: {
      showPageHeadings: true;
      services?: SideBarConfig;
      messages?: SideBarConfig;
      domains?: SideBarConfig;
      teams?: SideBarConfig;
      users?: SideBarConfig;
    };
  };
}
