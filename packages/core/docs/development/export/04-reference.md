---
sidebar_position: 4
keywords:
- EventCatalog export
- Custom export frontmatter
- Export configuration
- Export CLI
sidebar_label: Reference
title: Export reference
description: Paths, frontmatter fields, selectors, configuration, CLI options and APIs for the architecture reference and custom exports.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

Everything about exporting your catalog in one place: the [architecture reference](/docs/development/export/architecture-reference) and [custom exports](/docs/development/export/custom-exports).

## Paths {#paths}

Custom exports are files in the `exports` folder at the root of your catalog, one per export:

```txt
/exports/{id}.mdx
/exports/{id}.md
```

The folder isn't searched recursively. Set [`exports.custom.dir`](#exports-custom) to use another folder.

## Output {#output}

| File | Static build | [Server mode](/docs/development/deployment/build-ssr-mode) | Hosted at |
| --- | --- | --- | --- |
| Architecture reference | `dist/architecture.html` | `dist/client/architecture.html` | `/architecture.html` |
| Custom export | `dist/exports/{id}.html` | `dist/client/exports/{id}.html` | `/exports/{id}.html` |

The [CLI](#cli) writes `architecture.html` or `{id}.html` in the folder you run it from, unless you pass `--output`.

Every file is self-contained: styles, scripts, schemas and specifications are inside it. Only the latest version of each resource is exported.

## Frontmatter {#frontmatter}

The frontmatter of a custom export file. Any other field is an error, and every problem in a file is reported at once.

Values are read as text, so `version: 2026.10` stays `2026.10`.

### Required fields

#### `title` {#title}

- Type: `string`

The export's title, shown at the top of the page and in link previews.

```md title="Example"
---
title: Payments for partners
---
```

#### `include` {#include}

- Type: `array` of [selectors](#selectors)

What's in the export. A domain or system brings what's inside it.

```md title="Example"
---
include:
  - system: payment-processing-system
  - event: payment-succeeded
  - x-public: true
---
```

### Optional fields

#### `id` {#id}

- Type: `string`
- Default: the file name, without its extension

The export's id. It names the HTML file and is what you pass to the CLI. Letters, numbers, `-` and `_` only, and unique across the folder.

```md title="Example"
---
id: payments-for-partners
---
```

#### `summary` {#summary}

- Type: `string`

A sentence under the title. Also used as the description in link previews.

```md title="Example"
---
summary: How partners take payment for orders and stay in sync with what happens next.
---
```

#### `audience` {#audience}

- Type: `string`

Who the export is for, shown under the title.

```md title="Example"
---
audience: Partners integrating with Acme Checkout
---
```

#### `version` {#version}

- Type: `string`

The export's own version, shown at the top of the page.

```md title="Example"
---
version: 2026.10
---
```

#### `exclude` {#exclude}

- Type: `array` of [selectors](#selectors)

What to take out again. Applied before `include`, and always wins. Excluding a domain or system takes out everything in it, and an excluded resource is never named in the export.

```md title="Example"
---
exclude:
  - service: payment-worker
  - x-internal: true
---
```

#### `references` {#references}

- Type: `omit`, `name-only` or `include`
- Default: `omit`, or [`exports.custom.defaults.references`](#exports-custom)

What to show for links to resources that aren't in the export:

| Value | What's shown |
| --- | --- |
| `omit` | Nothing. The link is dropped. |
| `name-only` | The resource's name, without a link. |
| `include` | The resource itself, pulled into the export. One level only: what it points at isn't followed. |

Links to excluded resources are always dropped.

```md title="Example"
---
references: name-only
---
```

#### `hide` {#hide}

- Type: `array`
- Default: `[owners, repository, contacts, docs]`, or [`exports.custom.defaults.hide`](#exports-custom)

Fields to leave out of every resource in the export. Set `hide: []` to show everything.

| Value | What it leaves out |
| --- | --- |
| `owners` | Who owns each resource, and what each team or user in the export owns |
| `repository` | Where a service's code lives |
| `contacts` | Team and user email addresses and Slack channels |
| `docs` | The resources' own documentation (the body of their pages) |
| `specifications` | OpenAPI, AsyncAPI and GraphQL specifications |
| `examples` | Example payloads for messages, including the one made from the schema |

```md title="Example"
---
hide: [owners, repository]
---
```

### Body

The body of the file is the export's introduction, in markdown, shown before the resources. It can link to resources with `[[type|id]]`. A link to a resource that isn't in the export reads "another service", "another event" and so on, or the resource's name with `references: name-only` (unless it was excluded).

## Selectors {#selectors}

`include`, `exclude` and [`neverExport`](#exports-custom) are lists of selectors.

### By id

One resource, by its kind and id, with an optional version:

```yaml
- service: checkout-api
  version: 1.x
```

| Key | Matches |
| --- | --- |
| `domain` | A domain, with its subdomains, systems, services, entities and flows, and the messages its services send and receive |
| `system` | A system, with its services, data stores, entities and flows, and the messages its services send and receive |
| `service` | A service, or an agent with that id when no service has it |
| `agent` | An agent |
| `event`, `command`, `query` | A message of that kind |
| `message` | An event, command or query with that id |
| `channel` | A channel |
| `data-store` (or `container`) | A data store |
| `flow` | A flow |
| `entity` | An entity |
| `team`, `user` | A team or a user |

`version` is an exact version or a semver range. Only the latest version of each resource is exported, so it must match the latest one.

### By custom property

Every resource with [custom properties](/docs/development/customization/custom-properties) that have the given values:

```yaml
- x-operational-tier: [1, 2]
  kind: [service, agent]
```

| Key | Description |
| --- | --- |
| `x-…` | A custom property, and the value (or list of values) it must have. Every `x-` key in a selector must match. |
| `kind` | Optional. One kind, or a list of them, from the table above. |

- Values are compared as text: `true` matches `true` and `"true"`, and `1` matches `1` and `"1"`.
- A resource's list matches when any of its items does.
- Objects can't be matched.
- A selector can't also name a resource by id, or take a `version`.

## Configuration {#configuration}

### `exports.html` {#exports-html}

<AddedIn version="5.1.0" />

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `exports.html.enabled` | `boolean` | `true` (`false` with authentication) | Write the architecture reference when you build. |

### `exports.custom` {#exports-custom}

<AddedIn version="5.2.0" />

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `exports.custom.enabled` | `boolean` | `true` (`false` with authentication) | Write the custom exports when you build. |
| `exports.custom.dir` | `string` | `'exports'` | The folder with your custom export files, relative to your catalog. |
| `exports.custom.only` | `string[]` | | Build only these custom exports, by id. The CLI can still export any of them. |
| `exports.custom.defaults.hide` | `string[]` | `['owners', 'repository', 'contacts', 'docs']` | What every custom export [hides](#hide), unless it sets its own `hide`. |
| `exports.custom.defaults.references` | `string` | `'omit'` | What every custom export shows for [links out of it](#references), unless it sets its own. |
| `exports.custom.neverExport` | `object[]` | | [Selectors](#selectors) for resources no custom export may show, whatever it includes. |

### When exports are written

| Your catalog | `enabled` not set | `true` | `false` |
| --- | --- | --- | --- |
| Without [authentication](/docs/development/authentication/introduction) | Written | Written | Not written |
| With authentication | Not written | Written | Not written |

Files in the build output are served without the authentication checks, so catalogs with authentication must turn exports on. Custom exports are only looked for when the folder has `.md` or `.mdx` files.

Each custom export is written on its own. One with a problem (a field that isn't valid, an id another file uses too, or nothing in it) is skipped with a warning in the build's output, and the others are still written. The build doesn't fail.

### Example

```js title="eventcatalog.config.js"
module.exports = {
  exports: {
    html: {
      enabled: true,
    },
    custom: {
      only: ['partner-payments', 'personal-data'],
      defaults: {
        hide: ['owners', 'repository', 'contacts', 'docs'],
        references: 'omit',
      },
      neverExport: [
        { service: 'fraud-detection' },
        { 'x-data-classification': ['confidential', 'restricted'] },
      ],
    },
  },
};
```

See the [full configuration reference](/docs/api/config) for every EventCatalog option.

## CLI {#cli}

Run the [`export` command](/docs/cli/cli-export) of the [EventCatalog CLI](/docs/cli) from the root of your catalog:

```bash
# The architecture reference
npx @eventcatalog/cli export --format html

# A custom export, by id
npx @eventcatalog/cli export partner-payments

# What's in a custom export, without writing it
npx @eventcatalog/cli export partner-payments --check
```

| Option | Description |
| --- | --- |
| `<id>` | The custom export to write. Leave it out, with `--format html`, for the architecture reference. |
| `--format html` | Export as HTML. Not needed with an id. |
| `--check` | With an id: list what's in the export, what was left out and why, without writing it. |
| `--output <path>` | Where to write the file. Defaults to `architecture.html` or `<id>.html` |
| `--no-open` | Don't open the file in your browser. It's never opened in CI, or when the output isn't a terminal. |
| `--stdout` | Print the HTML instead of writing a file. |
| `--dir <path>` | Path to your catalog, if you aren't running the command from it. |

The command exits with `1` when an export has a problem (an unknown id, or a field that isn't valid), and when `--check` finds a selector that matches nothing in the catalog.

### Check output

`--check` lists, in groups:

| Group | What it lists |
| --- | --- |
| Included | Every resource in the export, and why: `include`, `in system …`, `include x-public: true`, `referenced by …` |
| Excluded | What `exclude` or `neverExport` took out of what the export would otherwise have |
| Links dropped | Links to resources outside the export, and why: `not in this export`, `exclude` |
| Links shown as names | With `references: name-only`, the links shown as plain names |
| Not found | Selectors that matched nothing, and why |
| Links in docs that lead outside the export | `[[type\|id]]` links in docs, and the text shown in their place |
| Hidden | The fields left out |

## SDK {#sdk}

[`getResourcesByProperty`](/docs/development/customization/custom-properties#find-resources-by-custom-property) finds resources by custom property, as custom exports do:

```js
import utils from '@eventcatalog/sdk';

const { getResourcesByProperty } = utils('/path/to/eventcatalog');

await getResourcesByProperty('x-operational-tier', { equals: 1, types: ['service'], latestOnly: true });
```

| Option | Type | Description |
| --- | --- | --- |
| `equals` | any | Only resources whose value is this one. |
| `in` | `array` | Only resources whose value is one of these. |
| `types` | `string[]` | Only these kinds of resource, such as `service`, `event` or `domain`. |
| `latestOnly` | `boolean` | Only the latest version of each resource. |

Each result has the resource's `type`, `id`, `version`, the property's `value`, the `path` to its file and whether it's the `latest` version.

## Exporters package {#exporters-package}

To export from your own scripts, use the `@eventcatalog/exporters` package, which the build and the CLI use:

```js
import { renderHtml, writeHtml, renderCustomExports, writeCustomExports, formatCustomExportReport } from '@eventcatalog/exporters';

// The architecture reference
const { html } = await renderHtml('/path/to/catalog');
await writeHtml({ dir: '/path/to/catalog', outputPath: 'architecture.html' });

// Custom exports: all of them, or those in `only`
const { rendered, failed } = await renderCustomExports('/path/to/catalog', { only: ['partner-payments'] });
console.log(formatCustomExportReport(rendered[0].report));
await writeCustomExports({ dir: '/path/to/catalog', outputDir: 'dist/exports' });
```

| Function | Returns |
| --- | --- |
| `renderHtml(dir)` | `{ html, model }`: the architecture reference |
| `writeHtml({ dir, outputPath })` | `{ html, model, path, bytes, durationMs }` |
| `renderCustomExports(dir, { only?, config? })` | `{ rendered, failed }`: `rendered` has `{ spec, html, model, report }` for each custom export, and `failed` has `{ id, file, error }` for each one that couldn't be exported |
| `writeCustomExports({ dir, outputDir, only?, config? })` | `{ written, failed }`: the same, with each file's `path` and `bytes` |
| `formatCustomExportReport(report)` | The `--check` output, as text |
| `loadCatalog(dir)` | The catalog as one resolved model, to build your own export |

`config` is `exports.custom` from `eventcatalog.config.js`, which is read from the catalog when you don't pass it.

Each custom export stands alone. One that can't be exported (its file has problems, two files share its id, it has nothing in it, or an id in `only` has no file) is in `failed`, with a `CustomExportError` that lists every problem in its `problems`, and the others are still exported. A problem with `exports.custom` itself throws.
