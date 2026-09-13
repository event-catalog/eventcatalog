---
sidebar_position: 4
sidebar_label: Configure validation rules
title: Configure Federation validation rules
description: Change federation diagnostics to off, warn, or error for your organization.
---

import EventCatalogEnterprise from '@site/src/components/MDX/EventCatalogEnterprise';

<EventCatalogEnterprise />

Federation rules work like lint rules. Every supported rule has one of three levels:

| Level | Behavior |
| --- | --- |
| `off` | Do not report the diagnostic |
| `warn` | Report the diagnostic and continue |
| `error` | Report the diagnostic and stop before installing new output |

Unconfigured rules keep the default levels shown below.

## Available rules

| Rule | Default | When it appears | Typical fix |
| --- | --- | --- | --- |
| `federation/duplicate-source` | `error` | More than one catalog documents and claims ownership of the same resource ID | Choose one owning catalog and remove copied or placeholder definitions from the others |
| `federation/type-collision` | `error` | The same resource ID is documented with different types, such as an event in one catalog and a command in another | Correct the resource type or give the different resources unique IDs |
| `federation/pointer-type-mismatch` | `error` | A relationship expects one resource type, but the referenced resource is documented as another type | Correct the relationship pointer or point it to the intended resource |
| `federation/facet-disagreement` | `error` | Catalogs contribute contradictory information for the same resource facet | Choose an authoritative source and align or remove the conflicting contribution |
| `federation/asset-collision` | `warn` | Remote catalogs publish different files to the same `public/` or `components/` path | Namespace the paths, make the files identical, or deliberately accept the last configured source as the winner |
| `federation/missing-resource` | `warn` | A relationship references a resource ID that no participating catalog documents | Add the owning catalog, document the missing resource, or correct the referenced ID |
| `federation/unresolved-version` | `warn` | The referenced resource exists, but none of its available versions satisfy the requested version or range | Reference an available version or publish a version that satisfies the request |

Rules that default to `error` protect the catalog from ambiguous ownership or resource types. Rules that default to `warn` allow teams to onboard catalogs incrementally while keeping incomplete relationships and asset collisions visible.

For the diagnostic messages and output attributes associated with each rule, see the [diagnostic rule reference](/docs/federation/reference/diagnostic-rules).

## Add rule overrides

Add `rules` beside `sources`:

```js title="eventcatalog.config.js"
export default {
  federation: {
    rules: {
      'federation/missing-resource': 'error',
      'federation/unresolved-version': 'error',
      'federation/asset-collision': 'off',
    },
    sources: [
      // ...
    ],
  },
};
```

## Make unresolved references block a build

Missing IDs and unavailable versions are warnings by default because organizations often introduce catalogs gradually.

Use errors when every relationship in the organization view must resolve:

```js title="eventcatalog.config.js"
rules: {
  'federation/missing-resource': 'error',
  'federation/unresolved-version': 'error',
}
```

This is useful in CI after all expected owning catalogs have been onboarded.

## Keep asset collisions visible

Asset collisions use `warn` by default. The last configured remote source wins when remote sources publish different content to the same path.

Keep this warning enabled unless the collision is deliberate and reviewed:

```js title="eventcatalog.config.js"
rules: {
  'federation/asset-collision': 'warn',
}
```

The diagnostic identifies the asset path, all contributing sources, and the winning source.

## Be careful with structural rules

These rules default to `error` because continuing can produce an ambiguous organization model:

- `federation/duplicate-source`
- `federation/type-collision`
- `federation/pointer-type-mismatch`
- `federation/facet-disagreement`

:::warning Changing ownership errors

Changing a structural rule to `warn` or `off` allows Federation to continue with ambiguity that would normally block the update. Prefer fixing the ownership boundary, resource type, or relationship pointer.

Use lower levels temporarily only when you understand how the resulting catalog will be interpreted.

:::

## Review warning details

Run with `--verbose`:

```bash
npx eventcatalog federate --verbose
```

Warnings are grouped with their rule ID and attributes. Errors always show details, even without verbose output.

## Validate the configuration

Federation rejects unknown rule IDs and invalid levels. For example, `fatal` is not a valid level.

Run Federation after editing the rules:

```bash
npx eventcatalog federate
```

## Next steps

- Look up every [diagnostic rule](/docs/federation/reference/diagnostic-rules)
- [Resolve common Federation problems](/docs/federation/reference/troubleshooting)
- [Understand ownership and cross-catalog references](/docs/federation/explanation/ownership-and-references)
