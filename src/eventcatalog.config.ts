type SideBarConfig = {
  visible: boolean;
};

type ResourceDependency = {
  id: string;
  version?: string;
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
  trailingSlash?: boolean;
  rss?: {
    enabled: boolean;
    limit: number;
  };
  llmsTxt?: {
    enabled: boolean;
  };
  logo?: {
    alt: string;
    src: string;
    text?: string;
  };
  asyncAPI?: {
    renderParsedSchemas?: boolean;
  };
  mdxOptimize?: boolean;
  docs: {
    sidebar: {
      type?: 'TREE_VIEW' | 'LIST_VIEW';
      showPageHeadings: true;
      services?: SideBarConfig;
      messages?: SideBarConfig;
      domains?: SideBarConfig;
      teams?: SideBarConfig;
      users?: SideBarConfig;
    };
  };
  dependencies?: {
    commands?: ResourceDependency[];
    events?: ResourceDependency[];
    services?: ResourceDependency[];
    domains?: ResourceDependency[];
  };
  mermaid?: {
    iconPacks?: string[];
  };
  chat?: {
    enabled: boolean;
    model?: string;
    max_tokens?: number;
    similarityResults?: number;
  };
}
