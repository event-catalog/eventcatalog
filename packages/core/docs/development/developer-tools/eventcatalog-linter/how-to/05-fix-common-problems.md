---
sidebar_position: 5
sidebar_label: Fix common problems
title: Fix common linter findings
description: What the most frequent linter messages mean and the quickest way to resolve each one.
---

Use this guide as a lookup table when the linter reports something and you want the fix, not the theory. Findings are grouped by rule; every rule is documented in full in the [rules reference](../reference/rules).

## "Unknown property … Did you mean …?"

```
6:1 ✖ error Unknown property "owner". Did you mean "owners"? [owner] (schema/unknown-field)
```

A frontmatter key isn't part of the schema — almost always a typo. Rename it to the suggestion. If it's a deliberate custom field, prefix it with `x-` (see [Allow custom frontmatter](./use-custom-frontmatter)).

If the message says the key "is valid on service resources, but not on event resources", you've copied frontmatter from one resource type to another; remove the key or use the equivalent for that type (for example events use `producers`/`consumers`, services use `sends`/`receives`).

## "… is not recognised as an EventCatalog resource and will be ignored"

```
1:1 ⚠ warning File "events/OrderCreated.mdx" is not recognised … Did you mean "events/OrderCreated/index.mdx"? (structure/unrecognised-file)
```

The file is in a place EventCatalog never reads. Move it to the suggested path. The common shapes:

| You have | You need |
|----------|----------|
| `events/OrderCreated.mdx` | `events/OrderCreated/index.mdx` |
| `event/…`, `Services/…`, `comands/…` | `events/…`, `services/…`, `commands/…` |
| `users/john/index.mdx` | `users/john.mdx` (users and teams are flat files) |
| `events/OrderCreated/versioned/index.mdx` | `events/OrderCreated/versioned/1.0.0/index.mdx` |
| `services/order-service/notes.mdx` | `services/order-service/docs/notes.mdx` (only `index.mdx` is a resource) |

See [Supported resources](../reference/supported-resources) for every folder the linter scans.

## "Referenced … does not exist"

```
9:5 ✖ error Referenced event/command/query "OrderCreatd" does not exist. Did you mean "OrderCreated"? [sends[0]] (refs/resource-exists)
```

The id doesn't match any resource of the expected type. Check for:

- **A typo** — the message suggests the closest id.
- **The wrong type** — "`payment-service` exists as a service, not a event/command/query" means the id is real but you referenced it from a field that expects a different type.
- **A resource from another catalog** — declare it in `dependencies` (see [Reference external catalogs](./reference-external-catalogs)).
- **A resource the linter can't see** — it may be misplaced (look for an accompanying `structure/unrecognised-file` warning) or matched by an `ignorePatterns` entry.

## "… does not have a version matching …"

```
9:14 ✖ error Referenced event "OrderCreated" does not have a version matching "3.0.0". Available versions: 2.0.0, 1.0.0 [sends[0]] (refs/valid-version-range)
```

The resource exists, but not at that version. Either pick one of the listed versions, use a range (`^2.0.0`, `2.x`) or `latest`, or add the missing version under `versioned/`. Version formats and matching are described in the [versions reference](../reference/versions).

If the message says the reference "has an invalid version reference", the value isn't a version, range or `latest` at all — for example `two` or `version-1`.

## "Referenced schema file … does not exist"

```
7:13 ✖ error Referenced schema file "schema.json" does not exist (looked for "events/OrderCreated/schema.json") [schemaPath] (refs/file-exists)
```

The path in `schemaPath`, `schemas[]`, `specifications` or a data product contract doesn't resolve to a file. Paths are relative to the resource's own folder — so a versioned copy under `versioned/1.0.0/` needs its own `schema.json` next to it. The "looked for" path shows exactly where the linter checked.

For `styles.icon`, paths starting with `/` are checked against the catalog's `public/` folder. If your static assets live elsewhere, set `['error', { publicDir: 'static' }]` or disable icon checks with `{ icons: false }`.

## "version: Expected string, but received undefined"

```
2:1 ✖ error version: Expected string, but received undefined [version] (schema/valid-type)
```

A required field is missing — here `version`. Add it. The same rule reports fields of the wrong type, such as `owners: platform-team` (a string) instead of a list.

## "Invalid semantic version format"

```
4:10 ✖ error version: Invalid semantic version format [version] (schema/valid-semver)
```

Use a format EventCatalog understands: semver (`1.2.3`, `1.0.0-beta`), a number-like version (`1`, `1.2`, `v1`, `V2`) or `latest`. Values like `one`, `1.0.0.0` or `version-1` are rejected.

## "… has no producer and no consumer"

```
2:5 ⚠ warning event "OrderCreated" has no producer and no consumer [id] (refs/orphan-messages)
```

Nothing sends or receives the message, so it won't appear in any visualiser. Add it to a service's `sends` or `receives`, list `producers`/`consumers` on the message itself, or — if it's intentionally standalone — set the rule to `'off'` for that folder using an override.

## "At least one owner is required" / "Summary is required"

Add `owners:` (a list of user or team ids) or `summary:` to the resource. If a resource type genuinely shouldn't need these in your catalog, relax the rule for that folder:

```js title=".eventcatalogrc.js"
module.exports = {
  overrides: [{ files: ['**/containers/**'], rules: { 'best-practices/owner-required': 'off' } }],
};
```

## "Duplicate … also defined in …"

Two files declare the same type, `id` and `version`. Usually one is a leftover copy or a versioned file whose `version` wasn't updated — delete one or correct the version.

## "Parse error: …"

```
5:14 ✖ error Parse error: unexpected end of the stream within a flow collection (@eventcatalog/parse-error)
```

The frontmatter isn't valid YAML. The position points at the failing token; look for unbalanced brackets, a missing space after a colon, or inconsistent indentation.

## Related

- [Rules reference](../reference/rules)
- [Configure rules](./configure-rules)
