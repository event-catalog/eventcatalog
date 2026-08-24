/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/src/federation/LICENSE
 */

import { isEventCatalogEnterpriseEnabled } from '@eventcatalog/license';

/**
 * Federation is enabled through the Enterprise offline entitlement. Keep
 * callers plan-agnostic so licensing details remain isolated from the
 * federation workflow.
 */
export const isFederationEnabled = () => isEventCatalogEnterpriseEnabled();
