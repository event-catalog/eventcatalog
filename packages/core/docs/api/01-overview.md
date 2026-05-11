---
sidebar_position: 1
keywords:
- EventCatalog CLI
sidebar_label: EventCatalog CLI
title: EventCatalog CLI
description: Understand the CLI of EventCatalog
---

EventCatalog provides a set of scripts to help you generate, serve, and deploy your catalog.

Once your catalog is bootstrapped, the source will contain the EventCatalog scripts that you can invoke with your package manager:

```json title="package.json"
{
  // ...
  "scripts": {
    // Runs the dev server locally
    "dev": "eventcatalog dev",
    // Builds the catalog
    "build": "eventcatalog build",

    // start/preview both run the built catalog locally.
    "start": "eventcatalog start",
    "preview": "eventcatalog preview",

    // Export your catalog as JSON
    "export": "eventcatalog export",
  }
}
```

import TOCInline from "@theme/TOCInline"

<TOCInline toc={toc} minHeadingLevel={3}/>

## EventCatalog CLI commands {#eventcatalog-cli-commands}

Below is a list of EventCatalog CLI commands and their usages:

### `eventcatalog dev` {#eventcatalog-dev-sitedir}

Runs your catalog in development mode.

This will start the dev server and watch for changes to your catalog. You will use this as you develop your catalog.


### `eventcatalog start/preview` {#eventcatalog-start-sitedir}

Runs EventCatalog in production mode, requires a `build` first. This will serve the built catalog from the `dist` folder.

Can be used to preview your catalog before deploying.

### `eventcatalog build` {#eventcatalog-build-sitedir}

Builds your catalog for production, and outputs the catalog to the `dist` folder.

### `eventcatalog export` {#eventcatalog-export}

Exports your entire catalog as a JSON file using the SDK's `dumpCatalog` function. The export is saved to the `exports/` directory in your project with a date stamp (e.g. `exports/catalog-2026-03-30.json`).

**Options:**

| Option | Description |
|--------|-------------|
| `--include-markdown` | Include markdown content in the export (default: `false`) |

```bash
# Export catalog as JSON
eventcatalog export

# Export with markdown content included
eventcatalog export --include-markdown
```
