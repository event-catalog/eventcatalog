---
sidebar_position: 6
keywords:
- EventCatalog configuration
sidebar_label: Configuration
title: Configuration
description: Understand how to configure EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

Most new EventCatalog projects are ready to run as soon as they are created. You only need to change configuration when you want to adjust how the catalog behaves, where it builds, or which features are enabled.

Configuration lives in `eventcatalog.config.js` at the root of your project.

Use this file for catalog-level settings, such as the catalog title, organization name, build output, deployment path, and integrations.

## Start with the generated config

When you create a new EventCatalog project, the starter creates an `eventcatalog.config.js` file for you. For many catalogs, you can leave this file alone while you create your first domains, services, and messages.

Your config may look something like this:

```js title="eventcatalog.config.js"
module.exports = {
  cId: '107fdebb-7c68-42cc-975d-413b1d30d758',
  title: 'EventCatalog',
  organizationName: 'Your Company',
};
```

- `cId` is generated for your catalog. Keep the generated value.
- `title` is the name shown in your catalog.
- `organizationName` identifies the team or company that owns the catalog.

## Common changes

You do not need to learn every configuration option up front. These are the settings most teams change first:

The examples below show only the option being changed. Keep the other values that already exist in your config.

### Change the catalog name

```js title="eventcatalog.config.js"
module.exports = {
  title: 'Acme Architecture Catalog',
  organizationName: 'Acme',
};
```

### Change the build output

By default, EventCatalog builds a static website that can be hosted almost anywhere.

Some features require EventCatalog to run as a server. You can switch the build output with the `output` option.

```js title="eventcatalog.config.js"
module.exports = {
  output: 'server',
};
```

Learn more about build output in the [configuration API](/docs/api/config#output).

### Configure a deployment base path

If your catalog is hosted under a sub-path, configure `base`.

```js title="eventcatalog.config.js"
module.exports = {
  base: '/architecture/',
};
```

For a catalog hosted at the root of a domain, keep the default `/`.

## Full configuration reference

This page only covers the basics. When you need the complete list of options, use the [eventcatalog.config.js API reference](/docs/api/config).

Configuration guides for specific features live near the feature they configure. For example:

- [Adding Analytics](/docs/development/guides/adding-analytics)
- [RSS feeds](/docs/api/config#rss)
- [Authentication](/docs/development/authentication/introduction)
- [Deployment](/docs/development/deployment/build-and-deploy)

## Configuring environment variables {#configuring-environment-variables}

<AddedIn version="2.35.4" />

Some features need values that should not live directly in `eventcatalog.config.js`, such as license keys or provider credentials.

Put those values in a `.env` file in the root of your catalog. EventCatalog loads `.env` when it runs locally and when it builds.

```bash title=".env (example)"
EVENTCATALOG_SCALE_LICENSE_KEY=your-api-key
```

Do not commit real secrets to source control.

## Related configuration

EventCatalog has a linter that can be used to validate your EventCatalog documentation.

You can read more about the EventCatalog Linter in the [EventCatalog Linter documentation](/docs/development/developer-tools/eventcatalog-linter).

### Advanced: disable channel migration

On startup, EventCatalog automatically migrates legacy `channels` definitions on messages to the service-level channels shape.

Most new catalogs do not need to change this behavior. If you are working with an older catalog and want to leave legacy channel definitions untouched, set `EVENTCATALOG_DISABLE_CHANNEL_MIGRATION`.

**Accepted values:** `true`, `1`, or `yes` (case-insensitive). Any other value, or leaving the variable unset, keeps the default behavior: the migration runs as normal.

```bash
EVENTCATALOG_DISABLE_CHANNEL_MIGRATION=true npx @eventcatalog/core dev
```

You can also set it in your `.env` file:

```bash title=".env"
EVENTCATALOG_DISABLE_CHANNEL_MIGRATION=true
```
