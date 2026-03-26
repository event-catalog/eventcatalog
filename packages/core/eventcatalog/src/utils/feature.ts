import config from '../../eventcatalog.config.js';

// Open-source feature flags
export const isSSR = () => config?.output === 'server';
export const isVisualiserEnabled = () => config?.visualiser?.enabled ?? true;
export const isChangelogEnabled = () => config?.changelog?.enabled ?? false;
export const isRSSEnabled = () => config?.rss?.enabled ?? false;
export const isLLMSTxtEnabled = () => config?.llmsTxt?.enabled ?? true;
export const isMarkdownDownloadEnabled = () => config?.llmsTxt?.enabled ?? true;
export const isFullCatalogAPIEnabled = () => config?.api?.fullCatalogAPIEnabled ?? false;
export const isDevMode = () => process.env.EVENTCATALOG_DEV_MODE === 'true';

// Re-export enterprise feature flags for backwards compatibility.
// These functions are subject to the EventCatalog Commercial License.
// See /packages/core/eventcatalog/src/enterprise/LICENSE
export {
  isEventCatalogStarterEnabled,
  isEventCatalogScaleEnabled,
  isPrivateRemoteSchemaEnabled,
  isEmbedEnabled,
  showEventCatalogBranding,
  showCustomBranding,
  isCustomDocsEnabled,
  isResourceDocsEnabled,
  isEventCatalogChatEnabled,
  isEventCatalogUpgradeEnabled,
  isCustomLandingPageEnabled,
  isAuthEnabled,
  isCustomStylesEnabled,
  isDiagramComparisonEnabled,
  isEventCatalogMCPEnabled,
  isIntegrationsEnabled,
  isExportPDFEnabled,
} from '../enterprise/feature';
