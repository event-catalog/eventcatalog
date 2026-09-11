---
sidebar_position: 4
keywords:
- licenses
- validation
- offline
sidebar_label: License Validation
title: How license validation works
description: How EventCatalog validates your license keys online and offline.
---

Once you have a license key from [EventCatalog Cloud](https://eventcatalog.cloud) (see [Overview](/docs/development/license-keys/overview) if you don't yet), EventCatalog validates it every time you build or serve your catalog. There are two modes: online and offline.

## Online validation (default)

By default, EventCatalog validates license keys online. Your keys are read from your `.env` file (or environment variables) and verified against the EventCatalog API.

This is the recommended mode — it requires no extra setup and your keys stay in sync with your account automatically.

## Offline validation

If you're behind a firewall or otherwise can't reach the EventCatalog API at build time, you can validate your keys offline.

To set up offline validation:

1. Email us at `hello@eventcatalog.dev` to request an offline license file (`license.jwt`).
2. Place the `license.jwt` file in the root of your catalog directory.
3. EventCatalog will validate against the local file instead of calling our API.

Offline license files expire one year from purchase. You'll need to request a new file each year.

## Managing your keys

You can view, rotate, and revoke license keys at any time from your [API keys dashboard](https://eventcatalog.cloud/dashboard/api-keys).
