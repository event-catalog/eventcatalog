/**
 * Licensed under the EventCatalog Commercial License.
 * See /packages/core/eventcatalog/src/enterprise/LICENSE
 */

import type { AnalyticsAdapter, EventProperties } from '../tracker';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export const ga4Adapter: AnalyticsAdapter = {
  name: 'ga4',
  track(event: string, properties?: EventProperties) {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', event, properties);
    }
  },
  pageView(url: string, properties?: EventProperties) {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', { page_location: url, ...properties });
    }
  },
};
