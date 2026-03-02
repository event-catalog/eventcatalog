/** Thin wrapper around the PostHog global so call-sites stay clean. */

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}

export function track(event: string, properties?: Record<string, unknown>) {
  window.posthog?.capture(event, properties);
}
