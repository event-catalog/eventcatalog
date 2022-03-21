import { AnalyticsConfig } from '@eventcatalog/types';

// eslint-disable-next-line import/no-unresolved
import config from 'eventcatalog.config';

const { analytics } = config;
const { googleAnalyticsTrackingId } = analytics || ({} as AnalyticsConfig);

declare const window: any;

/**
 * Register page view event
 * @param url
 */
export const pageview = (url) => {
  if (window?.gtag && googleAnalyticsTrackingId) {
    window.gtag('config', googleAnalyticsTrackingId, {
      page_path: url,
    });
  }
};

/**
 * Register event
 * @param action
 * @param category
 */
export const event = ({ action, params }) => {
  window.gtag('event', action, params);
};
