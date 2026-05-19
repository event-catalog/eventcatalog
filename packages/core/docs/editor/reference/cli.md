---
sidebar_position: 1
sidebar_label: CLI
title: EventCatalog Editor CLI reference
description: Command and option reference for running EventCatalog Editor.
---

Run the editor with:

```bash
npx @eventcatalog/editor
```

## Requirements

- Node.js 22 or later
- Git
- An EventCatalog directory containing `eventcatalog.config.js`

## Options

| Option | Description | Default |
| --- | --- | --- |
| `--catalog <path>` | Path to the EventCatalog root to edit. | Current directory, a detected child catalog, or browser selection |
| `--port <n>` | Port for the editor server. | `3900` |
| `--eventcatalog-port <n>` | Port where local EventCatalog preview is running. | `3000` |
| `--no-open` | Start the editor without opening the browser automatically. | Opens browser |
| `--help`, `-h` | Show CLI help. |  |
| `--version`, `-v` | Show the installed editor version. |  |

## Examples

Run from a catalog directory:

```bash
npx @eventcatalog/editor
```

Run against a specific catalog:

```bash
npx @eventcatalog/editor --catalog /Users/me/dev/my-catalog
```

Use a different editor port:

```bash
npx @eventcatalog/editor --port 3999
```

Use a different EventCatalog preview port:

```bash
npx @eventcatalog/editor --eventcatalog-port 3001
```

Start without opening a browser:

```bash
npx @eventcatalog/editor --no-open
```
