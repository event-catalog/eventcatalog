---
sidebar_position: 3
sidebar_label: Rules
title: Linter rules reference
description: Every rule the EventCatalog Linter can report — what it checks, its default severity, its options, an example message and how to fix it.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

Rules are grouped into five categories. Each rule can be set to `'error'`, `'warn'` or `'off'` in [`.eventcatalogrc.js`](./configuration); rules marked **options** also accept `[severity, { ... }]`.

| Rule | Default | Options |
|------|---------|---------|
| [`schema/required-fields`](#schemarequired-fields) | error | |
| [`schema/valid-type`](#schemavalid-type) | error | |
| [`schema/valid-semver`](#schemavalid-semver) | error | |
| [`schema/valid-email`](#schemavalid-email) | error | |
| [`schema/validation-error`](#schemavalidation-error) | error | |
| [`schema/unknown-field`](#schemaunknown-field) | error | `allow`, `suggestions` |
| [`schema/unknown-nested-field`](#schemaunknown-nested-field) | warn | `allow`, `suggestions` |
| [`refs/owner-exists`](#refsowner-exists) | error | |
| [`refs/resource-exists`](#refsresource-exists) | error | |
| [`refs/valid-version-range`](#refsvalid-version-range) | error | |
| [`refs/channel-exists`](#refschannel-exists) | error | |
| [`refs/container-exists`](#refscontainer-exists) | error | |
| [`refs/file-exists`](#refsfile-exists) | error | `icons`, `publicDir` |
| [`refs/orphan-messages`](#refsorphan-messages) | warn | |
| [`best-practices/summary-required`](#best-practicessummary-required) | error | |
| [`best-practices/owner-required`](#best-practicesowner-required) | error | |
| [`best-practices/description-required`](#best-practicesdescription-required) | warn | |
| [`best-practices/schema-required`](#best-practicesschema-required) | warn | |
| [`versions/no-deprecated-references`](#versionsno-deprecated-references) | warn | |
| [`structure/duplicate-resource-ids`](#structureduplicate-resource-ids) | error | |
| [`structure/unrecognised-file`](#structureunrecognised-file) | warn | |

YAML that cannot be parsed at all is reported as `(@eventcatalog/parse-error)`. It is always an error and cannot be configured.

## Schema validation

These rules validate frontmatter against the same schemas EventCatalog uses.

### `schema/required-fields`

A required field is missing from the frontmatter. Which fields are required depends on the resource type; `id`, `name` and `version` are required almost everywhere.

```
2:1 ✖ error name: Required [name] (schema/required-fields)
```

**Fix:** add the field.

### `schema/valid-type`

A field has the wrong type — a string where a list is expected, a missing required field reported as `undefined`, and so on.

```
2:1 ✖ error version: Expected string, but received undefined [version] (schema/valid-type)
7:9 ✖ error owners: Expected array, but received string [owners] (schema/valid-type)
```

**Fix:** correct the value's shape. Lists in YAML are written with `- ` items or `[a, b]`.

### `schema/valid-semver`

A `version` (or a version inside a reference) isn't a format EventCatalog understands.

```
4:10 ✖ error version: Invalid semantic version format [version] (schema/valid-semver)
```

**Fix:** use semver (`1.2.3`, `1.0.0-beta`), a number-like version (`1`, `1.2`, `v1`, `V2`), `latest`, or a range (`^1.0.0`, `1.x`). See the [versions reference](./versions).

### `schema/valid-email`

An `email` field on a user or team isn't a valid email address.

**Fix:** correct the address.

### `schema/validation-error`

A schema problem that doesn't fit the categories above. The message carries the underlying detail.

### `schema/unknown-field`

<AddedIn version="1.1.17" pkg="@eventcatalog/linter" url="https://github.com/event-catalog/eventcatalog" />

A top-level frontmatter key isn't part of the resource's schema. EventCatalog rejects unknown top-level keys at build time unless they start with `x-`, so this rule catches typos and stray custom fields before the build does. The message suggests the closest known key, or tells you when the key belongs to a different resource type.

```
6:1 ✖ error Unknown property "owner". Did you mean "owners"? [owner] (schema/unknown-field)
8:1 ✖ error Unknown property "costCenter". Custom properties must start with "x-". [costCenter] (schema/unknown-field)
5:1 ✖ error Unknown property "sends". "sends" is valid on service, agent, domain resources, but not on event resources. [sends] (schema/unknown-field)
```

**Options**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allow` | `string[]` | `[]` | Keys, or `prefix*` patterns, to accept. Matched against the key name and the full path |
| `suggestions` | `boolean` | `true` | Include "Did you mean" and other-resource-type hints |

```js
'schema/unknown-field': ['error', { allow: ['costCenter', 'legacy*'], suggestions: true }]
```

Keys starting with `x-` are always allowed, as are the `catalog`, `versions` and `latestVersion` fields the SDK writes into generated content.

**Fix:** rename the key, or prefix it with `x-`. See [Allow custom frontmatter](../how-to/use-custom-frontmatter).

### `schema/unknown-nested-field`

<AddedIn version="1.1.17" pkg="@eventcatalog/linter" url="https://github.com/event-catalog/eventcatalog" />

The same check for keys inside nested objects and arrays (`sends[0].too`, `detailsPanel.ownerz`). EventCatalog silently ignores these rather than failing, which is why the default is `warn` — but a typo here usually means a relationship or setting is being dropped. Options are the same as `schema/unknown-field`, and an `allow` list set on either rule applies to both.

```
12:9 ⚠ warning Unknown property "sends[0].too". Did you mean "to"? [sends[0].too] (schema/unknown-nested-field)
```

Arbitrary keys are permitted where the schema allows them — flow step `custom.properties`, channel `parameters`, and any `producers`/`consumers` object.

## Reference validation

These rules check that everything your frontmatter points at actually exists. References can be plain ids (`- order-service`) or objects (`- id: order-service`, optionally with `version`). Version matching follows the [versions reference](./versions).

### `refs/owner-exists`

An entry in `owners` (or an ADR's `decisionMakers`) doesn't match any user or team.

```
6:5 ✖ error Referenced user/team "platfrom-team" does not exist. Did you mean "platform-team"? [owners[0]] (refs/owner-exists)
```

**Fix:** correct the id, or add the user (`users/<id>.mdx`) or team (`teams/<id>.mdx`).

### `refs/resource-exists`

A referenced resource id doesn't exist among the resource types the field accepts — `sends`/`receives` (events, commands, queries), `services`, `domains`, `entities`, `flows`, flow steps, ADR `appliesTo`, data product `inputs`/`outputs`, and so on. The message adds a "did you mean" suggestion for near-miss ids, or points out when the id exists as a different resource type.

```
9:5 ✖ error Referenced event/command/query "OrderCreatd" does not exist. Did you mean "OrderCreated"? [sends[0]] (refs/resource-exists)
9:5 ✖ error Referenced flow "PlaceOrder" does not exist. "PlaceOrder" exists as a command, not a flow. [appliesTo[0]] (refs/resource-exists)
```

This rule fires whether or not the reference has a version — if the id itself is unknown, the version is irrelevant.

**Fix:** correct the id, create the resource, or declare it as an external [dependency](../how-to/reference-external-catalogs).

### `refs/valid-version-range`

The referenced resource exists, but no version of it satisfies the reference. The message lists the versions that do exist, newest first. It also fires when the version reference isn't a version, range or `latest` at all.

```
9:14 ✖ error Referenced event "OrderCreated" does not have a version matching "3.0.0". Available versions: 2.0.0, 1.0.0 [sends[0]] (refs/valid-version-range)
9:14 ✖ error Referenced event "OrderCreated" has an invalid version reference "two". Use a version (1.0.0, v1), a range (^1.0.0, 1.x) or "latest". Available versions: 1.0.0 [sends[0]] (refs/valid-version-range)
```

**Fix:** reference an existing version or a range that matches one, or add the version under `versioned/`.

### `refs/channel-exists`

A channel referenced from `sends[].to`, `receives[].from`, a message's `channels`, or a channel's `routes`/`channels` doesn't exist (or doesn't exist at that version).

```
11:9 ✖ error Referenced channel "orders-topic" does not exist. Did you mean "orders"? [sends[0].to[0]] (refs/channel-exists)
```

### `refs/container-exists`

A container referenced from `writesTo`, `readsFrom`, a system's `containers`, or a container-typed flow step doesn't exist. `dataStore` is accepted as a legacy alias for `container`.

```
13:5 ✖ error Referenced container "orders-db" does not have a version matching "9.0.0". Available versions: 1.0.0 [writesTo[0]] (refs/container-exists)
```

### `refs/file-exists`

<AddedIn version="1.1.17" pkg="@eventcatalog/linter" url="https://github.com/event-catalog/eventcatalog" />

A file referenced from frontmatter doesn't exist. The linter resolves each path the way EventCatalog does:

| Field | Resolved against |
|-------|------------------|
| `schemaPath` | the resource's own folder |
| `schemas[].file`, `schemas[].path` | the resource's own folder |
| `schemas[].ref` | `file://<relative>` against the resource folder; `file:///<absolute>` as given. Other refs (schema registries) are skipped |
| `specifications.openapiPath` / `asyncapiPath` / `graphqlPath`, `specifications[].path` | the resource's own folder; `http(s)://` values are skipped |
| data product `outputs[].contract.path` | the resource's own folder |
| `styles.icon` starting with `/` | the catalog's `public/` folder; icon names and URLs are skipped |

Because paths resolve against the resource's own folder, a versioned copy under `versioned/1.0.0/` must have its own schema file next to it.

```
7:13 ✖ error Referenced schema file "schema.json" does not exist (looked for "events/OrderCreated/schema.json") [schemaPath] (refs/file-exists)
15:9 ✖ error Referenced icon "/icons/go.svg" does not exist (looked for "public/icons/go.svg") [styles.icon] (refs/file-exists)
```

**Options**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `icons` | `boolean` | `true` | Check `styles.icon` paths |
| `publicDir` | `string` | `'public'` | Folder, relative to the catalog root, that `/`-prefixed icon paths are served from |

```js
'refs/file-exists': ['error', { icons: false, publicDir: 'static' }]
```

### `refs/orphan-messages`

An event, command or query that nothing produces or consumes: no service, agent or domain lists it in `sends`/`receives`, and the message itself has no `producers`/`consumers`. Messages declared as external dependencies are never orphans.

```
2:5 ⚠ warning event "OrderCreated" has no producer and no consumer [id] (refs/orphan-messages)
```

**Fix:** connect the message to a service, or turn the rule off for intentionally standalone messages.

## Best practices

Documentation-quality checks. They don't affect whether EventCatalog builds, so tune them to your team's standards.

### `best-practices/summary-required`

The resource has no `summary`, or it's blank. Users are exempt (the user schema has no summary field).

```
2:1 ✖ error Summary is required for better documentation [summary] (best-practices/summary-required)
```

### `best-practices/owner-required`

The resource has no `owners`, or the list is empty. Users and teams are exempt.

```
2:1 ✖ error At least one owner is required [owners] (best-practices/owner-required)
```

### `best-practices/description-required`

The file has no markdown body after the frontmatter.

```
14:1 ⚠ warning Resource should have a markdown description (body content) beyond just frontmatter [description] (best-practices/description-required)
```

### `best-practices/schema-required`

An event, command or query has no `schemaPath`.

```
2:1 ⚠ warning event should have a schemaPath defined for consumers to understand the contract [schemaPath] (best-practices/schema-required)
```

## Versioning

### `versions/no-deprecated-references`

A reference points at a resource marked `deprecated`. A reference without a version (or `latest`) is flagged if any version of the target is deprecated; a versioned reference is flagged only if that version is. Owner and team-member references are not checked.

```
9:5 ⚠ warning Referenced event "OrderCreated" (version: 1.0.0) is deprecated [sends[0]] (versions/no-deprecated-references)
```

## Catalog structure

### `structure/duplicate-resource-ids`

Two files declare the same resource type, `id` and `version`.

```
2:5 ✖ error Duplicate event "OrderCreated" (version: 1.0.0) — also defined in domains/Orders/events/OrderCreated/index.mdx [id] (structure/duplicate-resource-ids)
```

### `structure/unrecognised-file`

<AddedIn version="1.1.17" pkg="@eventcatalog/linter" url="https://github.com/event-catalog/eventcatalog" />

A `.md`/`.mdx` file lives under a resource folder but matches none of the locations EventCatalog loads resources from, so it will be silently ignored. The message suggests where the file probably belongs. Markdown that EventCatalog loads through other means — `docs/` folders, `pages/`, `changelog.md`, `ubiquitous-language.md` — and build artifacts are not reported. Files matched by `ignorePatterns` are skipped.

```
1:1 ⚠ warning File "events/OrderCreated.mdx" is not recognised as an EventCatalog resource and will be ignored. Did you mean "events/OrderCreated/index.mdx"? (structure/unrecognised-file)
1:1 ⚠ warning File "event/OrderCreated/index.mdx" is not recognised … Did you mean "events/OrderCreated/index.mdx"? (structure/unrecognised-file)
1:1 ⚠ warning File "users/john/index.mdx" is not recognised … users are flat files. Did you mean "users/john.mdx"? (structure/unrecognised-file)
```

Recognised locations are listed in [Supported resources](./supported-resources). Because a misplaced file means the catalog is missing content, consider promoting this rule to `'error'`.
