/**
 * ⚠️ WARNING: IMPORTANT LICENSE NOTICE ⚠️
 *
 * Manually setting environment variables (EVENTCATALOG_STARTER or EVENTCATALOG_SCALE) to 'true'
 * or modifying these functions without a valid license is strictly prohibited and constitutes
 * a violation of EventCatalog's terms of use and license agreement.
 *
 * To access premium features legally:
 * 1. Visit https://www.eventcatalog.dev/pricing
 * 2. Purchase an appropriate license
 * 3. Follow the official activation instructions
 */

import config from '@config';
import fs from 'fs';
import { join } from 'path';

// These functions check for valid, legally obtained access to premium features
export const isEventCatalogStarterEnabled = () => process.env.EVENTCATALOG_STARTER === 'true';
export const isEventCatalogScaleEnabled = () => process.env.EVENTCATALOG_SCALE === 'true';

export const isPrivateRemoteSchemaEnabled = () => isEventCatalogScaleEnabled() || isEventCatalogStarterEnabled();

export const showEventCatalogBranding = () => {
  const override = process.env.EVENTCATALOG_SHOW_BRANDING;
  // if any value we return true
  if (override) {
    return true;
  }
  return !isEventCatalogStarterEnabled() && !isEventCatalogScaleEnabled();
};

export const showCustomBranding = () => {
  return isEventCatalogStarterEnabled() || isEventCatalogScaleEnabled();
};

export const isChangelogEnabled = () => config?.changelog?.enabled ?? true;

export const isCustomDocsEnabled = () => isEventCatalogStarterEnabled() || isEventCatalogScaleEnabled();
export const isEventCatalogChatEnabled = () => {
  const isFeatureEnabledFromPlan = isEventCatalogStarterEnabled() || isEventCatalogScaleEnabled();
  return isFeatureEnabledFromPlan && config?.chat?.enabled && isSSR();
};

export const isEventCatalogUpgradeEnabled = () => !isEventCatalogStarterEnabled() && !isEventCatalogScaleEnabled();
export const isCustomLandingPageEnabled = () => isEventCatalogStarterEnabled() || isEventCatalogScaleEnabled();

export const isMarkdownDownloadEnabled = () => config?.llmsTxt?.enabled ?? false;
export const isLLMSTxtEnabled = () => (config?.llmsTxt?.enabled || isEventCatalogChatEnabled()) ?? false;

export const isAuthEnabled = () => {
  const directory = process.env.PROJECT_DIR || process.cwd();
  const hasAuthConfig = fs.existsSync(join(directory, 'eventcatalog.auth.js'));
  return (hasAuthConfig && isSSR() && isEventCatalogScaleEnabled()) || false;
};

export const isSSR = () => config?.output === 'server';

export const isVisualiserEnabled = () => config?.visualiser?.enabled ?? true;
