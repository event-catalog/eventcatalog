---
sidebar_position: 1
sidebar_label: Configuration
title: Federation configuration reference
description: Reference for federation sources and rule levels in eventcatalog.config.js.
---

import EventCatalogEnterprise from '@site/src/components/MDX/EventCatalogEnterprise';

<EventCatalogEnterprise />

Configure Federation under the `federation` key in the central catalog's `eventcatalog.config.js`.

```js title="eventcatalog.config.js"
export default {
  federation: {
    rules: {
      'federation/missing-resource': 'error',
    },
    sources: [
      {
        id: 'acme/payments',
        source: 'github:acme/payments-catalog',
        path: 'catalog',
        ref: 'main',
      },
    ],
  },
};
```

## `federation`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `sources` | `FederationSourceConfig[]` | Yes | Catalogs included in the organization view. Use an empty array to remove previous Federation output. |
| `rules` | `Record<FederationRuleId, FederationRuleLevel>` | No | Overrides diagnostic levels. Unconfigured rules keep their defaults. |

## Sources

Each entry in `federation.sources` selects one EventCatalog project.

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | `string` | Yes |  | Stable source identity used by indexes, ownership, generated paths, diagnostics, and the lockfile. |
| `source` | `string` | Yes |  | Source locator. Supported protocols are `github:` and `file:`. |
| `path` | `string` | No | `.` | Catalog directory within the selected repository or filesystem source. |
| `ref` | `string` | No | `main` | GitHub branch, tag, or commit. Not supported by filesystem sources. |

### Source IDs

Every source requires a non-empty `id`, and the same ID cannot be configured more than once.

Use stable organization-oriented IDs:

```js
{
  id: 'acme/payments',
  source: 'github:acme/payments-catalog',
}
```

Changing the repository or directory does not require changing the ID. Keeping it stable preserves understandable provenance and generated paths.

If a GitHub source publishes `catalog.index.json`, its `source` value must exactly match the configured `id`.

### GitHub locator

Syntax:

```text
github:<owner>/<repository>
```

Example at the repository root:

```js
{
  id: 'acme/payments',
  source: 'github:acme/payments-catalog',
}
```

Example in a monorepo:

```js
{
  id: 'acme/payments',
  source: 'github:acme/architecture-catalogs',
  path: 'catalogs/payments',
  ref: 'production',
}
```

GitHub authentication is read from `EVENTCATALOG_GITHUB_TOKEN`, then `GITHUB_TOKEN` as a fallback.

### Filesystem locator

Syntax:

```text
file:<path-from-central-catalog>
```

Example:

```js
{
  id: 'acme/payments',
  source: 'file:../payments-catalog',
}
```

Example with a catalog inside the selected source root:

```js
{
  id: 'acme/payments',
  source: 'file:../architecture-catalogs',
  path: 'payments',
}
```

Filesystem sources reject `ref`. Paths must remain within the selected source root, including after symbolic links are resolved.

## Rules

Every rule accepts:

```ts
'off' | 'warn' | 'error'
```

| Rule ID | Default |
| --- | --- |
| `federation/duplicate-source` | `error` |
| `federation/type-collision` | `error` |
| `federation/pointer-type-mismatch` | `error` |
| `federation/facet-disagreement` | `error` |
| `federation/asset-collision` | `warn` |
| `federation/missing-resource` | `warn` |
| `federation/unresolved-version` | `warn` |

Example:

```js title="eventcatalog.config.js"
export default {
  federation: {
    rules: {
      'federation/duplicate-source': 'error',
      'federation/missing-resource': 'error',
      'federation/asset-collision': 'off',
    },
    sources: [/* ... */],
  },
};
```

Unknown rule IDs and values other than `off`, `warn`, or `error` cause a configuration error.

See the [diagnostic rule reference](/docs/federation/reference/diagnostic-rules) for triggers and output attributes.

## Complete conditional source example

This example uses local sibling catalogs during development and GitHub in shared environments:

```js title="eventcatalog.config.js"
const source =
  process.env.EVENTCATALOG_FEDERATION_LOCAL === 'true'
    ? 'file:..'
    : 'github:acme/architecture-catalogs';

export default {
  federation: {
    rules: {
      'federation/unresolved-version': 'error',
    },
    sources: [
      {
        id: 'acme/orders',
        source,
        path: 'orders',
      },
      {
        id: 'acme/payments',
        source,
        path: 'payments',
      },
    ],
  },
};
```
