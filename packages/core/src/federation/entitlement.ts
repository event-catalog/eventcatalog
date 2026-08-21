/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/src/federation/LICENSE
 */

import { isEventCatalogScaleEnabled } from '@eventcatalog/license';

/**
 * Federation is currently enabled through the Scale entitlement. Keep callers
 * plan-agnostic so this can move to the Enterprise offline entitlement without
 * changing the federation workflow.
 */
export const isFederationEnabled = () => isEventCatalogScaleEnabled();
