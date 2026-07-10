---
sidebar_position: 99
sidebar_label: Adding Analytics
title: Adding Analytics
description: Track page views and user behavior across your catalog
---

import PlanBanner from '@site/src/components/MDX/PlanBanner';
import AddedIn from '@site/src/components/MDX/AddedIn';

<PlanBanner plan="Scale" />

EventCatalog supports analytics integrations that let you track how your team navigates and uses your catalog. Connect your existing analytics tools to understand which services, events, and flows your team visits most.

Three providers are supported: **Google Analytics 4**, **Google Tag Manager**, and **PostHog**. Multiple providers can be enabled at the same time.

*Don't see your analytics provider? [Get in contact with us](https://discord.gg/3rjaZMmrAm) and let us know.*

## How it works

Analytics are configured in `eventcatalog.config.js` under the `integrations` key. When EventCatalog loads, the provider scripts are injected into the page `<head>` and a tracker listens for every navigation event.

Every page view sends a set of properties automatically extracted from the URL:

| Property | Description |
|---|---|
| `url` | The page pathname |
| `section` | Catalog area: `visualiser`, `discover`, `directory`, `schemas`, `custom-docs`, `docs`, `home`, or `other` |
| `resource_type` | One of: `service`, `event`, `command`, `query`, `domain`, `flow`, `channel`, `entity` |
| `resource_id` | The resource identifier |
| `resource_version` | The semver version |

Analytics scripts load asynchronously and never block page rendering. If a provider fails, errors are caught silently so analytics never affect the catalog.

## Configure a provider

Add an `integrations` block to your `eventcatalog.config.js`. All providers are optional and can be combined.

### Google Analytics 4

```js title="eventcatalog.config.js"
export default {
  // ...
  integrations: {
    ga4: {
      measurementId: 'G-XXXXXXXXXX',
    },
  },
};
```

### Google Tag Manager

```js title="eventcatalog.config.js"
export default {
  // ...
  integrations: {
    gtm: {
      tagId: 'GTM-XXXXXXX',
    },
  },
};
```

### PostHog

```js title="eventcatalog.config.js"
export default {
  // ...
  integrations: {
    posthog: {
      apiKey: 'phc_XXXXXXXXXXXX',
      // Optional: defaults to US cloud
      apiHost: 'https://us.i.posthog.com',
    },
  },
};
```

### Use multiple providers

Providers can be combined in a single `integrations` block.

```js title="eventcatalog.config.js"
export default {
  // ...
  integrations: {
    ga4: {
      measurementId: 'G-XXXXXXXXXX',
    },
    gtm: {
      tagId: 'GTM-XXXXXXX',
    },
    posthog: {
      apiKey: 'phc_XXXXXXXXXXXX',
    },
  },
};
```

## Enable debug mode

Set `debug: true` to log all analytics events to the browser console. This is useful for verifying that events are being sent correctly before deploying.

```js title="eventcatalog.config.js"
export default {
  // ...
  integrations: {
    debug: true,
    ga4: {
      measurementId: 'G-XXXXXXXXXX',
    },
  },
};
```

All events will appear in the browser console prefixed with `[EventCatalog Analytics]`, including adapter registration, page views, and any custom events.

## Track custom events

The analytics manager is exposed on `window.__ec_analytics`. Use it to send custom events from your own scripts or MDX pages.

```js
if (window.__ec_analytics) {
  window.__ec_analytics.track('custom_event', { key: 'value' });
}
```

Custom events are forwarded to all configured providers simultaneously.

## Missing an integration?

If you need support for an analytics provider not listed here, [open a GitHub issue](https://github.com/boyney123/eventcatalog/issues) or [join the Discord community](https://discord.gg/3rjaZMmrAm) and let us know. We are always looking to expand our integrations based on what teams are using.

:::info Scale plan required
Analytics integrations require an [EventCatalog Scale plan](https://eventcatalog.dev/pricing). If you configure integrations without a valid license, a warning is shown during build.
:::
