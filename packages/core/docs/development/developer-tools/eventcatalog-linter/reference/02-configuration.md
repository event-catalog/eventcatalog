---
sidebar_position: 2
sidebar_label: Configuration
title: Linter configuration reference
description: The shape of .eventcatalogrc.js — rules, options, ignore patterns, overrides — and how it merges with the defaults.
---

The linter looks for `.eventcatalogrc.js` in the directory it lints. The file is optional; without it every rule runs at its default severity.

## Scaffold a configuration file

```bash
npx @eventcatalog/linter --init          # writes .eventcatalogrc.js
npx @eventcatalog/linter --init --force  # overwrites an existing one
```

The generated file lists every rule grouped by category, with a description, its default severity and an example of its options. It uses `export default` when the catalog's `package.json` has `"type": "module"` and `module.exports` otherwise.

## Shape

```js title=".eventcatalogrc.js"
module.exports = {
  rules: {
    '<rule-name>': '<severity>',
    '<rule-name>': ['<severity>', { /* options */ }],
  },
  ignorePatterns: ['<glob>', '<glob>'],
  overrides: [
    {
      files: ['<glob>', '<glob>'],
      rules: {
        '<rule-name>': '<severity>',
        '<rule-name>': ['<severity>', { /* options */ }],
      },
    },
  ],
};
```

Every top-level key is optional.

### `rules`

An object keyed by rule name. Rule names are listed in the [rules reference](./rules).

| Value | Effect |
|-------|--------|
| `'error'` | Report and fail the run |
| `'warn'` | Report; fail only with `--fail-on-warning` / `--max-warnings` |
| `'off'` | Don't check |
| `[severity, options]` | As above, with rule-specific options. See each rule for its options |

Unknown rule names are ignored silently.

### `ignorePatterns`

Glob patterns, matched against each file's path relative to the catalog root (forward slashes). Matching files are not validated, not counted, and not reported by `structure/unrecognised-file`.

`dependencies/**` is always ignored in addition to what you list.

Supported syntax is deliberately simple: `*` matches within a path segment and `**` matches across segments. A pattern beginning with `**/` needs at least one leading folder to match, so prefer `drafts/**` to `**/drafts/**` for a top-level folder.

### `overrides`

An ordered list. Each entry has `files` (glob patterns, same syntax as `ignorePatterns`) and `rules` (same shape as the top-level `rules`). For a given file, the top-level rules are applied first, then every override whose `files` matches, in order — later entries win.

## Merging with the defaults

At load time the linter merges your file over the built-in defaults:

- `rules` — your entries override the default severity for that rule; rules you don't mention keep their default.
- `ignorePatterns` — your patterns are appended to the default `['dependencies/**']`.
- `overrides` — used as given (the default is an empty list).

If the file exists but can't be loaded (syntax error, wrong module format), the linter prints a warning and continues with the defaults.

## Module format

`.eventcatalogrc.js` is loaded with Node's `require`. Use `module.exports` in a CommonJS project. In a project with `"type": "module"`, use `export default`; this is supported on Node.js 20.19 / 22.12 and later, where `require` can load ES modules. `--init` picks the right form automatically.

## `eventcatalog.config.js`

The linter also reads your catalog's `eventcatalog.config.js`, but only for `dependencies`, so that references to resources documented in other catalogs resolve. See [Reference external catalogs](../how-to/reference-external-catalogs). Nothing else in that file affects linting.

## Full example

```js title=".eventcatalogrc.js"
module.exports = {
  rules: {
    // Findings that mean EventCatalog will fail or silently drop something
    'schema/unknown-field': ['error', { allow: ['legacy*'] }],
    'refs/resource-exists': 'error',
    'refs/file-exists': ['error', { publicDir: 'static' }],
    'structure/unrecognised-file': 'error',

    // Documentation quality
    'best-practices/description-required': 'warn',
    'best-practices/schema-required': 'warn',
    'refs/orphan-messages': 'warn',
  },

  ignorePatterns: ['drafts/**'],

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
