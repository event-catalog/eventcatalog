---
sidebar_position: 4
sidebar_label: Troubleshooting
title: Troubleshooting EventCatalog Editor
description: Fix common issues when running EventCatalog Editor.
---

## The editor cannot find my catalog

Check that:

- You are running the editor from the catalog directory, or using `--catalog`
- The directory contains `eventcatalog.config.js`
- The config file can be loaded by Node.js
- Catalog dependencies are installed

Run with an explicit path:

```bash
npx @eventcatalog/editor --catalog /path/to/my-catalog
```

## I cannot sign in

The editor uses [EventCatalog Cloud](https://eventcatalog.cloud) for access.

If sign-in fails:

- Check your internet connection
- Try signing out of [EventCatalog Cloud](https://eventcatalog.cloud) and signing in again
- Restart the local editor
- Check that your account has editor access

If you see an editor access message, ask an organization admin to [invite you as an editor](/docs/editor/how-to/invite-editors) or change your role to **Editor** or **Admin**. Viewer accounts can sign in to [EventCatalog Cloud](https://eventcatalog.cloud), but they cannot open a local editor session.

## Preview is unavailable

Preview links require a local EventCatalog development server.

Start EventCatalog:

```bash
npm run dev
```

Then restart the editor. If your catalog runs on a different port, pass it with `--eventcatalog-port`.

## Changes are not shown

The Changes page uses Git. Check that:

- Your catalog is inside a Git repository
- Git is installed
- The files have actually changed on disk

You can also check from a terminal:

```bash
git status
```

## A save reports a conflict

A conflict means the file changed on disk after the editor loaded it.

Reload the resource, review the external change, and apply your edit again.

## A visual field is missing

The beta editor does not expose every possible EventCatalog field as a form yet.

Use source mode to edit unsupported frontmatter or MDX directly.

## Get help

Join the [EventCatalog Discord](https://eventcatalog.dev/discord) or [open an issue in the editor repository](https://github.com/event-catalog/eventcatalog-editor-code/issues).
