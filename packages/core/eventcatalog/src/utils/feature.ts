import fs from 'node:fs';
import { join } from 'node:path';
// Feature checks also run during Astro config evaluation, before @config exists.
import config from './eventcatalog-config/source';

const projectDirectory = () => process.env.PROJECT_DIR || process.cwd();

export const isEventCatalogChatVisible = () => config?.chat?.enabled ?? true;
export const isSSR = () => config?.output === 'server';
export const isVisualiserEnabled = () => config?.visualiser?.enabled ?? true;
// Opt-in while in beta — building the whole-catalog graph is unproven on very large catalogs
export const isArchitectureGraphEnabled = () =>
  isVisualiserEnabled() && (config?.visualiser?.architectureGraph?.enabled ?? false);
export const isChangelogEnabled = () => config?.changelog?.enabled ?? false;
export const isRSSEnabled = () => config?.rss?.enabled ?? false;
export const isLLMSTxtEnabled = () => config?.llmsTxt?.enabled ?? true;
export const isMarkdownDownloadEnabled = () => config?.llmsTxt?.enabled ?? true;
export const isFullCatalogAPIEnabled = () => config?.api?.fullCatalogAPIEnabled ?? false;
export const isDevMode = () => process.env.EVENTCATALOG_DEV_MODE === 'true';

// The assistant needs a model configured (eventcatalog.chat.js) and a server to run on
export const isEventCatalogChatEnabled = () =>
  fs.existsSync(join(projectDirectory(), 'eventcatalog.chat.js')) && isSSR() && isEventCatalogChatVisible();

// Authentication needs providers configured (eventcatalog.auth.js) and a server to run on
export const isAuthEnabled = () =>
  (config?.auth?.enabled ?? false) && fs.existsSync(join(projectDirectory(), 'eventcatalog.auth.js')) && isSSR();

export const isEventCatalogMCPEnabled = () => isSSR() && (config?.mcp?.enabled ?? true);
export const isEventCatalogMCPAuthEnabled = () => isEventCatalogMCPEnabled() && (config?.mcp?.auth?.enabled ?? false);
