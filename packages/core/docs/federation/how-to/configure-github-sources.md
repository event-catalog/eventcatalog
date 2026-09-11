---
sidebar_position: 1
sidebar_label: Configure GitHub sources
title: Configure GitHub federation sources
description: Add public or private GitHub-hosted EventCatalog projects to a central catalog.
---

import EventCatalogEnterprise from '@site/src/components/MDX/EventCatalogEnterprise';

<EventCatalogEnterprise />

Use this guide when the catalogs you want to federate are stored in GitHub repositories.

## Prerequisites

You need:

- A central EventCatalog project
- One or more EventCatalog projects in GitHub
- Git installed on the machine running Federation
- An EventCatalog Enterprise offline license. Email [hello@eventcatalog.dev](mailto:hello@eventcatalog.dev?subject=EventCatalog%20Federation%20Trial) to request a trial key.
- A GitHub token with read access when a repository is private

## Add a catalog at the repository root

Add the source to `federation.sources` in the central `eventcatalog.config.js`:

```js title="eventcatalog.config.js"
export default {
  federation: {
    sources: [
      {
        id: 'acme/payments',
        source: 'github:acme/payments-catalog',
      },
    ],
  },
};
```

The `github:` locator contains the GitHub owner and repository name. It does not contain a full URL.

## Add a catalog from a repository subdirectory

Use `path` when the EventCatalog is not at the repository root:

```js title="eventcatalog.config.js"
export default {
  federation: {
    sources: [
      {
        id: 'acme/payments',
        source: 'github:acme/platform',
        path: 'catalogs/payments',
      },
    ],
  },
};
```

`path` is relative to the source repository. It cannot be absolute or escape the repository.

## Choose a branch, tag, or commit

GitHub sources use `main` by default. Set `ref` to use another branch or tag:

```js title="eventcatalog.config.js"
{
  id: 'acme/payments',
  source: 'github:acme/payments-catalog',
  ref: 'production',
}
```

Use an exact commit SHA when the central build must repeatedly select the same source state:

```js title="eventcatalog.config.js"
{
  id: 'acme/payments',
  source: 'github:acme/payments-catalog',
  ref: '4a1b7e23c79b4ef9f5f337c5e7655a5ec82a4761',
}
```

The lockfile records what a run resolved, but it does not pin the next run. Repeatability comes from configuring an immutable `ref`.

## Authenticate to private repositories

Set one of these environment variables before running Federation:

```bash
export EVENTCATALOG_GITHUB_TOKEN=your-token
```

or:

```bash
export GITHUB_TOKEN=your-token
```

`EVENTCATALOG_GITHUB_TOKEN` takes precedence when both are set. The token needs read access to repository contents.

For local development, place the token in the central catalog's `.env` file:

```dotenv title=".env"
EVENTCATALOG_GITHUB_TOKEN=your-token
```

Do not commit the token.

## Configure several catalogs from one repository

Give each catalog a different stable `id` and `path`:

```js title="eventcatalog.config.js"
export default {
  federation: {
    sources: [
      {
        id: 'acme/orders',
        source: 'github:acme/architecture-catalogs',
        path: 'orders',
      },
      {
        id: 'acme/payments',
        source: 'github:acme/architecture-catalogs',
        path: 'payments',
      },
    ],
  },
};
```

Source IDs must be unique within the central configuration. Keep them stable if repositories or folders move, because the IDs are used in provenance, generated paths, diagnostics, and the lockfile.

## Run Federation

From the central catalog:

```bash
npx eventcatalog federate
```

If the source contains a `catalog.index.json`, Federation validates and uses it. Otherwise, Federation checks out the requested source and creates an index for the run.

Run with verbose diagnostics when you need details for every warning:

```bash
npx eventcatalog federate --verbose
```

## Next steps

- [Run Federation in CI](/docs/federation/how-to/run-in-ci)
- [Use local sources during development](/docs/federation/how-to/use-local-sources)
- Review the [source configuration reference](/docs/federation/reference/configuration#sources)
