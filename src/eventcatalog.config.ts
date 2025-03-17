export type SideBarConfig = {
  id: string;
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
  sidebar?: SideBarConfig[];
  docs: {
    sidebar: {
      type?: 'TREE_VIEW' | 'LIST_VIEW';
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
