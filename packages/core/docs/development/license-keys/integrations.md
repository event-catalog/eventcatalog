---
sidebar_position: 3
keywords:
- licenses
- integrations
- plugins
- openapi
- asyncapi
sidebar_label: Integrations
title: Getting a license key for integrations
description: How to activate EventCatalog integrations (OpenAPI, AsyncAPI, Backstage, and more) and get your license key.
---

EventCatalog integrations (sometimes called plugins) let you generate your catalog from sources you already have — OpenAPI specs, AsyncAPI documents, Backstage, federated catalogs, and more. You can see the full list on the [integrations page](/integrations).

Each integration is licensed individually and comes with a **14 day free trial**. Activate one from your [integrations dashboard](https://eventcatalog.cloud/dashboard/integrations) — see the [Quick start in the overview](/docs/development/license-keys/overview#quick-start) for the full step-by-step.

![Pick your integrations in EventCatalog Cloud](./images/pick-your-integraions.png)

Once activated, your license key for the integration appears on your [API keys page](https://eventcatalog.cloud/dashboard/api-keys):

![Your license keys in the EventCatalog Cloud API keys dashboard](./images/api-keys-dashboard.png)

## Adding your license key to your catalog

Copy the license key from your dashboard into your `.env` file. Each integration uses its own environment variable — the exact name is shown next to the key on your dashboard and in the integration's own documentation. For example:

```bash title=".env"
EVENTCATALOG_OPENAPI_LICENSE_KEY=your-license-key-here
EVENTCATALOG_ASYNCAPI_LICENSE_KEY=your-license-key-here
```

Then configure the integration in your `eventcatalog.config.js` as described in the [integration's documentation](/integrations).

## Trying multiple integrations

You can activate as many integrations as you want from your [integrations dashboard](https://eventcatalog.cloud/dashboard/integrations). Each one has its own 14 day trial and its own license key.

## Need more time?

If 14 days isn't enough to evaluate an integration in your environment, email us at `hello@eventcatalog.dev` and we'll extend your trial.
