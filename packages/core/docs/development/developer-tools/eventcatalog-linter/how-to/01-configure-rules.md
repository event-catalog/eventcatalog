---
sidebar_position: 1
sidebar_label: Configure rules
title: Configure linter rules
description: Change rule severities, pass rule options, ignore files, and apply different rules to different parts of the catalog.
---

Use this guide when the defaults don't match your team's standards. All configuration lives in a `.eventcatalogrc.js` file in the catalog root; see the [configuration reference](../reference/configuration) for the full shape.

## Create the file

The fastest start is the scaffold, which lists every rule with its description and default:

```bash
npx @eventcatalog/linter --init
```

Or write it by hand. Anything you leave out keeps its default, so a config can be as small as one line:

```js title=".eventcatalogrc.js"
module.exports = {
  rules: {
    'best-practices/description-required': 'off',
  },
};
```

:::tip ESM catalogs
If your catalog's `package.json` has `"type": "module"`, write `export default { ... }` instead of `module.exports = { ... }`. `--init` detects this for you.
:::

## Change a rule's severity

Each rule takes one of three values:

| Value | Effect |
|-------|--------|
| `'error'` | Reported and fails the run (exit code 1) |
| `'warn'` | Reported but doesn't fail the run, unless you pass `--fail-on-warning` or `--max-warnings` |
| `'off'` | Not checked |

```js title=".eventcatalogrc.js"
module.exports = {
  rules: {
    'best-practices/owner-required': 'warn', // soften
    'refs/orphan-messages': 'error',         // tighten
    'best-practices/schema-required': 'off', // disable
  },
};
```

Rule names are listed in the [rules reference](../reference/rules).

## Pass options to a rule

Some rules accept options. Use the array form `[severity, options]`:

```js title=".eventcatalogrc.js"
module.exports = {
  rules: {
    'schema/unknown-field': ['error', { allow: ['costCenter', 'legacy*'] }],
    'refs/file-exists': ['error', { icons: false }],
  },
};
```

The [rules reference](../reference/rules) documents which rules take options and what they mean.

## Ignore files

`ignorePatterns` skips files entirely — they are neither validated nor counted:

```js title=".eventcatalogrc.js"
module.exports = {
  ignorePatterns: ['drafts/**', 'domains/Legacy/**'],
};
```

`dependencies/**` is always ignored (it's where EventCatalog writes mocked external resources).

:::note
Patterns are matched against the path relative to the catalog root, and `**/` at the very start of a pattern currently requires at least one leading folder — write `drafts/**` rather than `**/drafts/**` to ignore a top-level `drafts` folder.
:::

## Apply different rules to different folders

`overrides` re-configures rules for files matching a glob. Later overrides win over earlier ones, and all of them win over the top-level `rules`:

```js title=".eventcatalogrc.js"
module.exports = {
  rules: {
    'best-practices/owner-required': 'error',
  },
  overrides: [
    {
      files: ['domains/Legacy/**'],
      rules: {
        'best-practices/owner-required': 'warn',
        'best-practices/summary-required': 'off',
      },
    },
    {
      files: ['**/containers/**'],
      rules: {
        'best-practices/description-required': 'off',
      },
    },
  ],
};
```

Options work inside overrides too: `'schema/unknown-field': ['warn', { allow: ['legacyId'] }]`.

## Which rules to keep strict

Rules fall into two groups. `schema/*`, `refs/*` and `structure/*` findings mean EventCatalog will fail the build, drop data or mis-render something — keep those as `'error'`. `best-practices/*`, `refs/orphan-messages` and `versions/no-deprecated-references` are documentation-quality opinions; tune them to your team's standards, and use overrides to relax them for legacy areas while enforcing them for new content.

## Check what's in effect

The config merges with the defaults at load time. If a rule doesn't behave the way you expect:

1. Check the rule name against the [rules reference](../reference/rules) — a misspelled rule name is silently ignored.
2. Check whether an override matches the file; overrides are applied in order.
3. Run with `--quiet` to confirm whether a finding is an error or a warning.

## Related

- [Configuration reference](../reference/configuration)
- [Rules reference](../reference/rules)
- [Allow custom frontmatter](./use-custom-frontmatter)
