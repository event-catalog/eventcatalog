/**
 * This file is licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE for the full terms.
 *
 * Modifying, disabling, or circumventing the license key functionality
 * in this file without a valid Commercial Subscription is prohibited.
 *
 * To obtain a license: https://www.eventcatalog.dev/pricing
 * Free 14-day trial: https://eventcatalog.cloud/
 */

import fs from 'fs';
import { join } from 'path';
import config from '../../eventcatalog.config.js';

// Inline isSSR to avoid circular dependency with ../utils/feature (which re-exports from this file)
const isSSR = () => config?.output === 'server';

// These functions check for valid, legally obtained access to premium features
export const isEventCatalogStarterEnabled = () => process.env.EVENTCATALOG_STARTER === 'true';
export const isEventCatalogScaleEnabled = () => process.env.EVENTCATALOG_SCALE === 'true';

export const isPrivateRemoteSchemaEnabled = () => isEventCatalogScaleEnabled() || isEventCatalogStarterEnabled();

export const isEmbedEnabled = () => process.env.ENABLE_EMBED === 'true';

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

export const isCustomDocsEnabled = () => isEventCatalogStarterEnabled() || isEventCatalogScaleEnabled();
export const isResourceDocsEnabled = () => isEventCatalogScaleEnabled();

export const isEventCatalogChatEnabled = () => {
  const isFeatureEnabledFromPlan = isEventCatalogStarterEnabled() || isEventCatalogScaleEnabled();
  const directory = process.env.PROJECT_DIR || process.cwd();
  const hasChatConfigurationFile = fs.existsSync(join(directory, 'eventcatalog.chat.js'));
  return isFeatureEnabledFromPlan && hasChatConfigurationFile && isSSR();
};

export const isEventCatalogUpgradeEnabled = () => !isEventCatalogStarterEnabled() && !isEventCatalogScaleEnabled();
export const isCustomLandingPageEnabled = () => isEventCatalogStarterEnabled() || isEventCatalogScaleEnabled();

export const isAuthEnabled = () => {
  const isAuthEnabledInCatalog = config?.auth?.enabled ?? false;
  const directory = process.env.PROJECT_DIR || process.cwd();
  const hasAuthConfigurationFile = fs.existsSync(join(directory, 'eventcatalog.auth.js'));
  return (isAuthEnabledInCatalog && hasAuthConfigurationFile && isSSR() && isEventCatalogScaleEnabled()) || false;
};

export const isCustomStylesEnabled = () => {
  return isEventCatalogStarterEnabled() || isEventCatalogScaleEnabled();
};

export const isDiagramComparisonEnabled = () => isEventCatalogScaleEnabled();

export const isEventCatalogMCPEnabled = () => isEventCatalogScaleEnabled() && isSSR();

export const isIntegrationsEnabled = () => isEventCatalogScaleEnabled();

export const isExportPDFEnabled = () => true;
