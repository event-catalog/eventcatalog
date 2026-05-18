---
sidebar_position: 2
keywords:
- licenses
- starter
- scale
- plans
sidebar_label: Starter & Scale Plans
title: Getting a license key for Starter or Scale
description: How to start a Starter or Scale plan in EventCatalog Cloud and get your license key.
---

EventCatalog offers two commercial plans you can self-serve from [EventCatalog Cloud](https://eventcatalog.cloud):

- **Starter** — for small teams getting started with commercial features.
- **Scale** — for larger teams that need the full set of advanced capabilities.

See the [pricing page](/pricing) for a full breakdown of what each plan includes.

## Starting a plan

1. Sign in to [EventCatalog Cloud](https://eventcatalog.cloud). If you don't have an account yet, sign up — it's free.
2. Go to your [dashboard](https://eventcatalog.cloud/dashboard).
3. Choose **Starter** or **Scale** and start your plan. Every plan comes with a **14 day free trial**, so you can try it before you commit.

   ![Pick your plan in EventCatalog Cloud](./images/pick-your-plan.png)

4. Once the plan is active, head to your [API keys page](https://eventcatalog.cloud/dashboard/api-keys) to find your license key.

   ![Your license keys in the EventCatalog Cloud API keys dashboard](./images/api-keys-dashboard.png)

## Adding your license key to your catalog

Copy the license key from your dashboard into your `.env` file:

```bash title=".env"
EVENTCATALOG_STARTER_LICENSE_KEY=your-license-key-here
# or for Scale
EVENTCATALOG_SCALE_LICENSE_KEY=your-license-key-here
```

Then start EventCatalog as normal. The commercial features for your plan will be unlocked automatically.

## Need more time?

The default trial is 14 days. If you need longer to evaluate, email us at `hello@eventcatalog.dev` and we'll extend it for you.

## Enterprise

If you need features beyond Scale — SSO, dedicated support, custom contracts, or on-premise/offline deployment — get in touch at `hello@eventcatalog.dev`.
