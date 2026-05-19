---
sidebar_position: 2
sidebar_label: Open a catalog
title: Open a catalog in the editor
description: Mount an EventCatalog project from the CLI or from the editor UI.
---

EventCatalog Editor needs a local catalog directory before it can show resources.

## How the editor finds a catalog

When you run `npx @eventcatalog/editor`, the editor looks for a catalog in this order:

1. The path passed with `--catalog`
2. The current directory, if it contains `eventcatalog.config.js`
3. The first child directory containing `eventcatalog.config.js`
4. The catalog path screen in the browser

## Open a catalog from the CLI

Pass the catalog path:

```bash
npx @eventcatalog/editor --catalog /path/to/my-catalog
```

Use an absolute path when possible. It makes it clear which catalog the editor is changing.

## Open a catalog from the browser

If the editor cannot find a catalog automatically, it shows a catalog path screen.

Enter the path to your EventCatalog project and choose **Open**.

## Fix catalog loading errors

If the editor cannot open the catalog, check that:

- The path points to the catalog root
- The directory contains `eventcatalog.config.js`
- The config file can be imported by Node.js
- Dependencies for the catalog are installed

If you are not sure what the catalog root should look like, read the [EventCatalog project structure guide](/docs/development/getting-started/project-structure).
