/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import { AstroAuth } from '@eventcatalog/auth-astro/server';
export const prerender = false;
export const { GET, POST } = AstroAuth();
