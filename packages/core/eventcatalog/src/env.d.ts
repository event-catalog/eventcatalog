/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare const __EC_TRAILING_SLASH__: boolean;
declare const __EC_BASE__: string;
declare const __EC_SEARCH_TYPE__: 'resource' | 'indexed';

interface EventCatalogConfig {
  mermaid?: {
    iconPacks?: string[];
    enableSupportForElkLayout?: boolean;
  };
}

interface Window {
  eventcatalog?: EventCatalogConfig;
}
