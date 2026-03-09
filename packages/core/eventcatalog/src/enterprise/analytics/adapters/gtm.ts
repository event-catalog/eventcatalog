import type { AnalyticsAdapter, EventProperties } from '../tracker';

declare global {
  interface Window {
    dataLayer?: Record<string, any>[];
  }
}

export const gtmAdapter: AnalyticsAdapter = {
  name: 'gtm',
  track(event: string, properties?: EventProperties) {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({ event, ...properties });
    }
  },
  pageView(url: string, properties?: EventProperties) {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push({ event: 'page_view', page_location: url, ...properties });
    }
  },
};
