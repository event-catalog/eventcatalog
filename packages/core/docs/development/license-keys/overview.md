---
sidebar_position: 1
keywords:
- licenses
- license keys
- trial
sidebar_label: Overview
title: License Keys Overview
description: Learn how license keys work in EventCatalog, how to get a free trial, and where to find your keys.
---

EventCatalog is open source with a [community edition and a commercial edition](/pricing). The commercial editions (Starter, Scale, Enterprise) and the [integrations](/integrations) (OpenAPI, AsyncAPI, Backstage, and others) are unlocked using **license keys**.

If you are using the community edition, you don't need a license key and can skip this section.

## Where license keys come from

All license keys are managed in [EventCatalog Cloud](https://eventcatalog.cloud). You sign up for an account, activate the plan or integration you want to use, and your license keys appear on your dashboard.

You can then add those keys to your `.env` file (or set them as environment variables) and EventCatalog will unlock the corresponding features.

## Free trials

:::tip 14 day free trials
Every plan and every integration comes with a **14 day free trial**. No payment is required to start one — just sign in to [EventCatalog Cloud](https://eventcatalog.cloud) and activate what you want to try.

Need longer to evaluate? Email us at `hello@eventcatalog.dev` and we'll happily extend your trial.
:::

## Quick start

1. Create an account at [eventcatalog.cloud](https://eventcatalog.cloud).
2. From your [dashboard](https://eventcatalog.cloud/dashboard), pick what you need:
   - [Pick your plan](https://eventcatalog.cloud/dashboard) (Starter or Scale) — see [Starting a plan](/docs/development/license-keys/plans).

     ![Pick your plan in EventCatalog Cloud](./images/pick-your-plan.png)

   - [Pick your integrations](https://eventcatalog.cloud/dashboard/integrations) (OpenAPI, AsyncAPI, etc.) — see [Getting integration keys](/docs/development/license-keys/integrations).

     ![Pick your integrations in EventCatalog Cloud](./images/pick-your-integraions.png)

3. Copy your license keys from the [API keys page](https://eventcatalog.cloud/dashboard/api-keys) into your `.env` file.

   ![Your license keys in the EventCatalog Cloud API keys dashboard](./images/api-keys-dashboard.png)

4. Run your catalog — your commercial features are now unlocked.

## Next steps

- [Starting a Starter or Scale plan](/docs/development/license-keys/plans)
- [Getting license keys for integrations](/docs/development/license-keys/integrations)
- [How license validation works (online and offline)](/docs/development/license-keys/license-validation)
