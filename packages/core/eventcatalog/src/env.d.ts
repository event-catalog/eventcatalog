/// <reference types="astro/client" />

declare const __EC_TRAILING_SLASH__: boolean;
declare const __EC_BASE__: string;
declare const __EC_SEARCH_TYPE__: 'resource' | 'indexed';

declare module '@catalog/styles';

declare module 'virtual:eventcatalog/homepage' {
  const homepage: any;
  export default homepage;
}

declare module 'virtual:likec4-projects' {
  export const projectRegistry: Record<string, () => Promise<{ LikeC4View: import('react').ComponentType<any> }>>;
  export const discoveredProjects: string[];
  export function getProjectLoader(projectName: string): () => Promise<{ LikeC4View: import('react').ComponentType<any> }>;
}

interface EventCatalogConfig {
  mermaid?: {
    iconPacks?: string[];
    enableSupportForElkLayout?: boolean;
  };
}

interface Window {
  eventcatalog?: EventCatalogConfig;
}
