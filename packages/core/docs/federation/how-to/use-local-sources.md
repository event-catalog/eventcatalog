---
sidebar_position: 2
sidebar_label: Use local sources
title: Use local catalogs during development
description: Run the federation pipeline against catalogs on your local filesystem.
---

import EventCatalogEnterprise from '@site/src/components/MDX/EventCatalogEnterprise';

<EventCatalogEnterprise />

Use filesystem sources to test cross-catalog relationships, ownership conflicts, rules, assets, and custom components before pushing source changes to GitHub.

## Configure a filesystem source

Set `source` to a `file:` locator:

```js title="eventcatalog.config.js"
export default {
  federation: {
    sources: [
      {
        id: 'acme/payments',
        source: 'file:../payments-catalog',
      },
    ],
  },
};
```

The path after `file:` is resolved from the central catalog directory.

Use `path` when the catalog is inside the selected filesystem source:

```js title="eventcatalog.config.js"
{
  id: 'acme/payments',
  source: 'file:../architecture-catalogs',
  path: 'payments',
}
```

Filesystem sources do not support `ref`.

## Switch the same sources between local and GitHub

Keep each source `id` and `path` stable, and select only the locator with an environment variable:

```js title="eventcatalog.config.js"
const federationSource =
  process.env.EVENTCATALOG_FEDERATION_LOCAL === 'true'
    ? 'file:..'
    : 'github:acme/architecture-catalogs';

export default {
  federation: {
    sources: [
      {
        id: 'acme/orders',
        source: federationSource,
        path: 'orders',
      },
      {
        id: 'acme/payments',
        source: federationSource,
        path: 'payments',
      },
    ],
  },
};
```

Run against the local catalogs:

```bash
EVENTCATALOG_FEDERATION_LOCAL=true npx eventcatalog federate
```

Run against GitHub:

```bash
npx eventcatalog federate
```

## Add a local npm script

For macOS and Linux, add a script to the central catalog:

```json title="package.json"
{
  "scripts": {
    "federate": "eventcatalog federate",
    "federate:local": "EVENTCATALOG_FEDERATION_LOCAL=true eventcatalog federate"
  }
}
```

Then run:

```bash
npm run federate:local
```

On Windows, set `EVENTCATALOG_FEDERATION_LOCAL` using your shell's environment variable syntax or use a cross-platform environment helper.

## Rerun after source changes

Filesystem federation is currently one-shot. When a source catalog changes, rerun:

```bash
EVENTCATALOG_FEDERATION_LOCAL=true npx eventcatalog federate
```

The EventCatalog development watcher does not automatically rerun Federation for changes in another catalog.

## Understand local revisions

Federation creates a content-derived revision such as `local:92400b8dfbe1` for each local source. The value changes when indexed source content changes and is recorded in `eventcatalog.lock`.

This revision identifies the state used by that run. It does not prevent later local edits from being selected by the next run.

## Test a diagnostic

To test organization-wide validation locally:

1. Add a relationship in one catalog that points to a missing ID.
2. Run local Federation with `--verbose`.
3. Confirm the `federation/missing-resource` warning names the source catalog, referring resource, and missing resource.
4. Add the resource to its owning catalog.
5. Rerun Federation and confirm the warning disappears.

> **_PLACEHOLDER_** — Terminal screenshot showing a locally triggered federation diagnostic.

## Next steps

- [Configure validation rules](/docs/federation/how-to/configure-validation-rules)
- [Understand ownership and references](/docs/federation/explanation/ownership-and-references)
- [Troubleshoot local source errors](/docs/federation/reference/troubleshooting#filesystem-source-errors)
