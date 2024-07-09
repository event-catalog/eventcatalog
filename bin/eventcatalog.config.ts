type SideBarConfig = {
  visible: boolean;
};

export interface Config {
  title: string;
  tagline: false;
  organizationName: string;
  homepageLink: string;
  editUrl: string;
  logo: {
    alt: string;
    src: string;
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
