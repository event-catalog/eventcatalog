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

// These functions check for valid, legally obtained access to premium features
export const isEventCatalogStarterEnabled = () => process.env.EVENTCATALOG_STARTER === 'true';
export const isEventCatalogScaleEnabled = () => process.env.EVENTCATALOG_SCALE === 'true';

export const isCustomDocsEnabled = () => isEventCatalogStarterEnabled() || isEventCatalogScaleEnabled();
export const isEventCatalogChatEnabled = () => {
  const isFeatureEnabledFromPlan = isEventCatalogStarterEnabled() || isEventCatalogScaleEnabled();
  return isFeatureEnabledFromPlan && config?.chat?.enabled;
};

export const isEventCatalogUpgradeEnabled = () => !isEventCatalogStarterEnabled() && !isEventCatalogScaleEnabled();
export const isCustomLandingPageEnabled = () => isEventCatalogStarterEnabled() || isEventCatalogScaleEnabled();

export const isMarkdownDownloadEnabled = () => config?.llmsTxt?.enabled ?? false;
