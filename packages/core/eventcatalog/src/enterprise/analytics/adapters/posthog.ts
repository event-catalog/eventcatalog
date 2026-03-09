import type { AnalyticsAdapter, EventProperties } from '../tracker';

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, any>) => void;
    };
  }
}

export const posthogAdapter: AnalyticsAdapter = {
  name: 'posthog',
  track(event: string, properties?: EventProperties) {
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture(event, properties);
    }
  },
  pageView(url: string, properties?: EventProperties) {
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('$pageview', { $current_url: url, ...properties });
    }
  },
};
