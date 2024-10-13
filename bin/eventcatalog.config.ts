type SideBarConfig = {
  visible: boolean;
};

export interface Config {
  title: string;
  tagline: false;
  organizationName: string;
  homepageLink: string;
  editUrl: string;
  landingPage?: string;
  base?: string;
  port?: string;
  outDir?: string;
  trailingSlash?: boolean;
  logo?: {
    alt: string;
    src: string;
    text?: string;
  };
  mdxOptimize?: boolean;
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
