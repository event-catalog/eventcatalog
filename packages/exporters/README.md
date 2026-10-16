# @eventcatalog/exporters

Export an [EventCatalog](https://www.eventcatalog.dev) to other formats.

It exports the **architecture reference**: your whole catalog as one self-contained HTML file you can share, attach or host anywhere. Every domain, system, service, message, channel, data store, flow, entity and team gets its own section, linked to everything it relates to, with message attributes from your schemas (JSON Schema, Avro and Protobuf), example payloads, TypeScript types and your specifications.

## You probably don't need this package directly

- **`eventcatalog build`** writes `architecture.html` into your build output on every build. Turn it off in `eventcatalog.config.js`:

  ```js
  export default {
    exports: {
      html: { enabled: false },
    },
  };
  ```

- **The CLI** exports it on demand and opens it in your browser:

  ```bash
  npx @eventcatalog/cli export --format html --output architecture.html
  ```

## Custom exports: parts of the catalog for people outside the team

A custom export is part of your catalog chosen for partners, the public or a regulator, written as a file in `exports/`. Its frontmatter says what's in it; its body is the introduction readers see first.

```mdx
---
# exports/partner-payments.mdx
title: Payments for partners
summary: How partners take payment for orders.
audience: Partners integrating with Acme Checkout
version: 2026.10
include:
  - system: payment-processing-system # a domain or system brings what's in it
  - service: checkout-api
    version: 1.x
  - event: payment-succeeded
  - x-public: true # every resource with this custom property (x- in its frontmatter)
    kind: [service, event] # optional: only these kinds
exclude:
  - service: payment-worker # wins over include, and brings nothing with it
  - x-data-classification: [confidential, restricted] # any of these values
references: omit # pointers at anything not in the export: omit, name-only or include (one level)
hide: [owners, repository, contacts, docs] # the default
---

Welcome! This guide covers everything you need to take payment for an Acme order.
```

- `eventcatalog build` writes each custom export to `exports/<id>.html` in the build output (with auth on, only when `exports.custom.enabled` is `true`). A file with problems is skipped with a warning, and the others are still written.
- `npx @eventcatalog/cli export partner-payments` writes one; add `--check` to list what's in it, what was left out and why, without writing it. `--check` fails when something the export names isn't in the catalog, so CI notices renames.
- `exports.custom` in `eventcatalog.config.js` sets `defaults` (`hide`, `references`) for every custom export, `only` to build some of them, `dir` for the folder, and `neverExport` for resources no custom export may show, whatever it includes.

Selectors name one resource (`service: checkout-api`, with an optional `version`) or match custom properties (`x-public: true`). In a property selector every `x-` field must match; a field matches when the resource's value is one of those given (compared as text, so `true` matches `"true"`), and a list in the resource's frontmatter matches when any of its items does. A matched domain or system brings what's in it, as one named by id does. The custom properties themselves never go out in an export.

A resource taken out by `exclude` or `neverExport` is never named: pointers at it are dropped, and links to it in docs read "another service".

## Using the package

```ts
import { renderHtml, writeHtml, loadCatalog, renderCustomExports, formatCustomExportReport } from '@eventcatalog/exporters';

// Render the reference as a string
const { html } = await renderHtml('/path/to/catalog');

// Or write it to a file
const { path, bytes, durationMs } = await writeHtml({ dir: '/path/to/catalog', outputPath: 'architecture.html' });

// Or load the catalog into one resolved model (relationships, schemas, owners) to build your own export
const model = await loadCatalog('/path/to/catalog');

// The custom exports in exports/: rendered, with a report of what's in each and what was left out.
// Each stands alone: one that can't be exported is in `failed`, with its error, and the rest are still rendered.
const { rendered, failed } = await renderCustomExports('/path/to/catalog');
console.log(formatCustomExportReport(rendered[0].report));
```

## License

MIT
