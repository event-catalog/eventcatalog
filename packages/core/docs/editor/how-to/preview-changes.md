---
sidebar_position: 8
sidebar_label: Preview changes
title: Preview editor changes
description: Open local EventCatalog preview links from the editor.
---

Preview lets you check how a resource looks in EventCatalog before committing your changes.

## Start EventCatalog locally

In your catalog project, run:

```bash
npm run dev
```

EventCatalog usually runs at [http://localhost:3000](http://localhost:3000).

## Start the editor

In another terminal, run:

```bash
npx @eventcatalog/editor
```

The editor checks whether EventCatalog is running locally. When it detects a preview, resource pages show **Open Preview**.

## Use a custom preview port

If EventCatalog is running on a different port, tell the editor:

```bash
npx @eventcatalog/editor --eventcatalog-port 3001
```

## Open a preview

Open a resource in the editor and choose **Open Preview**.

The editor opens the matching resource page in the local EventCatalog site.

![Editor header with Open Preview action](../images/header.png)

## Fix missing preview links

If preview is unavailable:

- Check that EventCatalog is running
- Check the preview port
- Restart the editor after starting EventCatalog
- Open the local EventCatalog URL directly to confirm it works

Preview is local. It does not publish your changes.
