---
sidebar_position: 1
sidebar_label: Run locally
title: Run EventCatalog Editor locally
description: Start EventCatalog Editor against a local EventCatalog project.
---

Use this guide when you want to start EventCatalog Editor on your machine.

## Prerequisites

You need:

- Node.js 22 or later
- Git
- An EventCatalog project containing `eventcatalog.config.js`
- EventCatalog Editor access through [EventCatalog Cloud](https://eventcatalog.cloud)

## Run from a catalog directory

Open a terminal in your EventCatalog project and run:

```bash
npx @eventcatalog/editor
```

The editor starts on [http://localhost:3900](http://localhost:3900).

## Run with an explicit catalog path

If you are not in the catalog directory, pass the catalog path:

```bash
npx @eventcatalog/editor --catalog /path/to/my-catalog
```

The directory must contain `eventcatalog.config.js`.

## Choose a different editor port

Use `--port` when port `3900` is already in use:

```bash
npx @eventcatalog/editor --port 3999
```

## Connect preview links to a running catalog

The editor looks for a local EventCatalog preview on port `3000` by default.

Start EventCatalog in your catalog project:

```bash
npm run dev
```

Then start the editor in another terminal:

```bash
npx @eventcatalog/editor
```

If your EventCatalog preview runs on another port, pass it to the editor:

```bash
npx @eventcatalog/editor --eventcatalog-port 3001
```

## Stop the editor

Return to the terminal running the editor and press `Ctrl+C`.
