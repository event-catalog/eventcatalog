type SideBarConfig = {
  visible: boolean;
};

export type AstroConfig = {
  mdxOptimize?: boolean;
};

export interface Config {
  title: string;
  tagline: false;
  organizationName: string;
  homepageLink: string;
  editUrl: string;
  base?: string;
  port?: string;
  trailingSlash?: boolean;
  logo?: {
    alt: string;
    src: string;
    text?: string;
  };
  astro?: AstroConfig;
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
