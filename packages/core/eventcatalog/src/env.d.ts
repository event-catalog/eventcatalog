/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare const __EC_TRAILING_SLASH__: boolean;

interface EventCatalogConfig {
  mermaid?: {
    iconPacks?: string[];
    enableSupportForElkLayout?: boolean;
  };
}

interface Window {
  eventcatalog?: EventCatalogConfig;
}
