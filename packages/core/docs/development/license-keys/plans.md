---
sidebar_position: 2
keywords:
- licenses
- scale
- plans
sidebar_label: Scale Plan
title: Getting a license key for EventCatalog Scale
description: How to start an EventCatalog Scale plan in EventCatalog Cloud and get your license key.
---

EventCatalog Scale is the self-serve commercial plan for teams that need automation, integrations, governance, and a living architecture catalog that stays in sync with code, specs, teams, and tools.

See the [pricing page](/pricing) for a full breakdown of what Scale includes.

## Starting a plan

1. Sign in to [EventCatalog Cloud](https://eventcatalog.cloud).
2. Go to your [dashboard](https://eventcatalog.cloud/dashboard).
3. Start your Scale Trial License.
4. Once the plan is active, head to your [API keys page](https://eventcatalog.cloud/dashboard/api-keys) to find your license key.

   ![Your license keys in the EventCatalog Cloud API keys dashboard](./images/api-keys-dashboard.png)

## Adding your license key to your catalog

Copy the license key from your dashboard into your `.env` file:

```bash title=".env"
EVENTCATALOG_SCALE_LICENSE_KEY=your-license-key-here
```

Then start EventCatalog as normal. Scale features will be unlocked automatically.

## Need more time?

The default trial is 30 days. If you need longer to evaluate, email us at `hello@eventcatalog.dev` and we'll extend it for you.

## Enterprise

If you need features beyond Scale — SSO, dedicated support, custom contracts, or on-premise/offline deployment — get in touch at `hello@eventcatalog.dev`.
