---
sidebar_position: 3
sidebar_label: Diagnostic rules
title: Federation diagnostic rule reference
description: Reference for every Federation rule, default level, trigger, output attributes, and resolution.
---

import EventCatalogEnterprise from '@site/src/components/MDX/EventCatalogEnterprise';

<EventCatalogEnterprise />

Federation diagnostics use stable rule IDs. Configure each rule as `off`, `warn`, or `error` under `federation.rules`.

| Rule | Default | Summary |
| --- | --- | --- |
| `federation/duplicate-source` | `error` | A resource has multiple owning catalogs |
| `federation/type-collision` | `error` | One resource ID is documented with conflicting types |
| `federation/pointer-type-mismatch` | `error` | A relationship expects the wrong target type |
| `federation/facet-disagreement` | `error` | Catalogs provide contradictory facets for a resource |
| `federation/asset-collision` | `warn` | Remote sources publish different files at one asset path |
| `federation/missing-resource` | `warn` | A relationship points to an ID that is not present |
| `federation/unresolved-version` | `warn` | The target ID exists, but its requested version does not |

## `federation/duplicate-source`

**Message:** `Resource has multiple owners`

Triggered when the same resource ID and type are owned by more than one catalog. All versions of one resource ID must have the same owner.

Attributes:

| Attribute | Meaning |
| --- | --- |
| `resource` | Conflicting resource ID |
| `catalogs` | Catalogs claiming ownership |
| `resolution` | Suggested ownership action |

Resolution: choose one owning catalog. Remove copied or placeholder resource definitions from consumers.

## `federation/type-collision`

**Message:** `Resource ID has conflicting types`

Triggered when the same resource ID is documented as different EventCatalog resource types, such as an event in one catalog and a command in another.

Attributes:

| Attribute | Meaning |
| --- | --- |
| `resource` | Conflicting resource ID |
| `<catalog ID>` | Type documented by that catalog |

Resolution: correct the resource type or use distinct IDs for different resources.

## `federation/pointer-type-mismatch`

**Message:** `Reference type does not match resource`

Triggered when a relationship pointer expects one target type but the resolved resource has another type.

Attributes:

| Attribute | Meaning |
| --- | --- |
| `resource` | Referenced resource ID |
| `expected type` | Type required by the relationship |
| `actual type` | Type documented by the owner |
| `catalogs` | Catalogs involved in the mismatch |

Resolution: correct the pointer or point it to the intended resource ID.

## `federation/facet-disagreement`

**Message:** `Catalogs disagree about this resource`

Represents contradictory contributed facets for a resource, such as incompatible content supplied for the same facet by several catalogs.

Attributes:

| Attribute | Meaning |
| --- | --- |
| `resource` | Resource ID with contradictory facets |
| `detail` | Available disagreement detail |
| `catalogs` | Catalogs contributing the conflicting values |

Resolution: decide which source is authoritative and align or remove the conflicting contribution.

## `federation/asset-collision`

**Message:** `Asset collision`

Triggered when remote sources publish different content to the same `public/` or `components/` path.

Attributes:

| Attribute | Meaning |
| --- | --- |
| `asset` | Conflicting catalog-relative asset path |
| `sources` | Sources publishing the path |
| `winner` | Source selected by Federation |
| `resolution` | Selection rule, currently `last configured source wins` |

Resolution: namespace the paths, make the files identical, or deliberately order the sources and keep the warning visible.

An existing public asset owned by the central catalog is preserved.

## `federation/missing-resource`

**Message:** `Referenced EventCatalog resource does not exist`

Triggered when a relationship points to a resource ID that is not documented by any participating remote or central catalog.

Attributes:

| Attribute | Meaning |
| --- | --- |
| `source catalog` | Catalog containing the relationship pointer |
| `referenced by` | Resource containing the pointer |
| `missing resource` | Missing ID and requested version, when present |

Resolution: add the owning catalog, document the resource in its owner, or correct the pointer ID.

## `federation/unresolved-version`

**Message:** `Referenced EventCatalog resource version does not exist`

Triggered when the resource ID exists, but no available version satisfies the pointer.

Attributes:

| Attribute | Meaning |
| --- | --- |
| `source catalog` | Catalog containing the relationship pointer |
| `referenced by` | Versioned resource containing the pointer |
| `resource` | Target resource ID |
| `requested version` | Exact version, range, or authored pointer value |
| `available versions` | Versions published by the owner |

Resolution: change the pointer to an available version or publish a matching version in the owning catalog.

## Configure levels

```js title="eventcatalog.config.js"
export default {
  federation: {
    rules: {
      'federation/missing-resource': 'error',
      'federation/unresolved-version': 'error',
      'federation/asset-collision': 'off',
    },
    sources: [/* ... */],
  },
};
```

Changing structural rules from `error` can allow ambiguous ownership or types into the generated view. See [Configure validation rules](/docs/federation/how-to/configure-validation-rules).

## Operational errors without rule IDs

Some failures stop Federation directly and do not have configurable `federation/*` rule IDs. These include:

- Missing or invalid license access
- Duplicate configured source IDs
- Unsupported source locators
- GitHub authentication or network failures
- Missing filesystem source directories
- Unsafe source, catalog, or artifact paths
- Invalid published indexes
- Content hash mismatches
- Unreadable lockfiles
- Filesystem write or rollback failures

See [Troubleshooting Federation](/docs/federation/reference/troubleshooting).
