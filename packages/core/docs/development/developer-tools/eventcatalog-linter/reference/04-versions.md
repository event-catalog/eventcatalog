---
sidebar_position: 4
sidebar_label: Versions
title: Version formats and matching
description: The version formats the linter accepts on resources and in references, and how a reference is matched against the versions that exist.
---

The linter accepts exactly the version formats EventCatalog accepts, and matches references the same way EventCatalog does when it builds pages and visualisations.

## Resource versions

The `version` field on a resource (`version: 1.0.0`) may be:

| Format | Examples | Notes |
|--------|----------|-------|
| Semantic version | `1.0.0`, `2.1.3-beta`, `1.0.0+build.5` | Compared as semver |
| Number-like | `1`, `1.2`, `v1`, `V2.1` | Coerced to semver for comparison (`v1` ≡ `1.0.0`, `1.2` ≡ `1.2.0`) |
| `latest` | `latest` | Accepted, but a resource without a comparable version can't satisfy range references |

Values that are none of these — `one`, `1.0.0.0`, `version-1` — are reported by [`schema/valid-semver`](./rules#schemavalid-semver).

:::note
YAML parses `version: 1` as a number, and EventCatalog's schema requires a string. Quote number-like versions: `version: "1"`.
:::

## Version references

Wherever frontmatter points at another resource, a `version` may be given:

```yaml
sends:
  - id: OrderCreated            # no version → latest
  - id: OrderCreated
    version: latest             # explicit latest
  - id: OrderCreated
    version: 2.1.0              # exact
  - id: OrderCreated
    version: v2                 # number-like, same as 2.0.0
  - id: OrderCreated
    version: ^2.0.0             # semver range
  - id: OrderCreated
    version: 2.x                # x-range
```

| Reference | Matches |
|-----------|---------|
| _(omitted)_ or `latest` | Any version of the resource — the newest is used |
| Exact (`2.1.0`, `V2`) | A version that is the same after coercion (`V2` matches `2`, `v2.0`, `2.0.0`) |
| Semver range (`^2.0.0`, `~2.1.0`, `>=1.5`, `1.0.0 - 2.0.0`) | Any version satisfying the range. `V` is normalised to `v` first |
| X-range (`2.x`, `0.0.x`) | Any version with that prefix |

A reference value that is none of these is reported by [`refs/valid-version-range`](./rules#refsvalid-version-range) as invalid.

## How matching is decided

For a reference with an id and version:

1. Is there any resource of an accepted type with that id? If not → [`refs/resource-exists`](./rules#refsresource-exists), regardless of the version.
2. Is the version omitted or `latest`? → match.
3. Does any existing version equal the reference exactly, or after coercion? → match.
4. Does any existing version satisfy the reference as a semver range or x-range? → match.
5. Otherwise → [`refs/valid-version-range`](./rules#refsvalid-version-range), listing the existing versions newest first.

A resource with no `version` in its frontmatter is indexed as `latest`. It matches references without a version, but not range references (`^1.0.0`), because `latest` has no numeric value to compare.

## External dependencies

Resources declared in `eventcatalog.config.js` `dependencies` take part in matching too. A dependency without a `version` matches any reference to its id; with a `version`, the rules above apply.

## Ordering

When the linter lists "available versions" it sorts newest first using semver comparison, so `V3` sorts above `2` above `v1`. If any version can't be compared numerically, the list falls back to reverse alphabetical order — the same rule EventCatalog uses to pick the latest version of a resource.

## Related

- [Versioning resources](/docs/development/guides/versioning-resources)
- [Reference external catalogs](../how-to/reference-external-catalogs)
