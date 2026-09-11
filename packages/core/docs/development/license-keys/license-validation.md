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

EventCatalog validates commercial features using online license keys or offline license files. Scale and integration keys use online validation by default. Enterprise features, including Federation, require an offline license file.

## Online validation (default)

By default, EventCatalog validates license keys online. Your keys are read from your `.env` file (or environment variables) and verified against the EventCatalog API.

This is the recommended mode — it requires no extra setup and your keys stay in sync with your account automatically.

## Offline validation

If you're behind a firewall or otherwise can't reach the EventCatalog API at build time, you can validate your keys offline.

EventCatalog Federation always uses this offline validation flow and requires an Enterprise license.

To set up offline validation:

1. Email [hello@eventcatalog.dev](mailto:hello@eventcatalog.dev?subject=EventCatalog%20Federation%20Trial) to request an offline license file (`license.jwt`). Tell us if you want to try Federation and we will send you an Enterprise trial key.
2. Place the `license.jwt` file in the root of your catalog directory.
3. EventCatalog will validate against the local file instead of calling our API.

You can commit `license.jwt` with your catalog so it is available locally and in CI/CD. If your organization prefers not to commit it, write the file during the CI/CD job instead. Set `EC_LICENSE` to the file path only when it is stored outside the catalog root.

Offline license files include an expiry date. Email `hello@eventcatalog.dev` when you need a trial, renewal, or replacement file.

## Managing your keys

You can view, rotate, and revoke license keys at any time from your [API keys dashboard](https://eventcatalog.cloud/dashboard/api-keys).
