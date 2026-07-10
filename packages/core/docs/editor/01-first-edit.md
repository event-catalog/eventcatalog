---
sidebar_position: 2
sidebar_label: First edit tutorial
title: Make your first edit with EventCatalog Editor
description: Learn the basic editor workflow by opening a local catalog, changing a resource, previewing it, and reviewing the Git change.
slug: /editor/first-edit
---

This tutorial takes you through the first successful editor workflow:

1. Run EventCatalog locally
2. Run EventCatalog Editor
3. Open a catalog resource
4. Make a small documentation change
5. Preview the resource
6. Review the Git diff
7. Publish the change

The goal is not to document a whole architecture. The goal is to learn the editor loop.

::::info Need a catalog?

This tutorial assumes you already have an EventCatalog project on your machine. If you do not, follow the [EventCatalog installation guide](/docs/development/getting-started/installation) first.

::::

## Prerequisites

Before you start, make sure you have:

- Node.js 22 or later
- Git installed
- An EventCatalog project containing `eventcatalog.config.js`
- Access to EventCatalog Editor through [EventCatalog Cloud](https://eventcatalog.cloud)
- A terminal open in or near your catalog project

If a teammate needs access, an organization admin can [invite them as an editor](/docs/editor/how-to/invite-editors).

Check Node and Git with:

```bash
node -v
git --version
```

## Start your EventCatalog preview

Open a terminal in your EventCatalog project and start EventCatalog:

```bash
npm run dev
```

By default, EventCatalog runs at [http://localhost:3000](http://localhost:3000).

The editor can still run without a preview, but preview links are only available when EventCatalog is running locally.

## Start the editor

Open another terminal in the same catalog directory and run:

```bash
npx @eventcatalog/editor
```

The editor starts on [http://localhost:3900](http://localhost:3900) and opens your browser.

If the editor asks you to sign in, sign in with [EventCatalog Cloud](https://eventcatalog.cloud) and return to the local editor.

## Open a resource

Choose a resource from the left navigation. A good first edit is a [service](/docs/development/guides/resources/services/introduction), [domain](/docs/development/guides/domains/introduction), [event](/docs/development/guides/resources/messages/message-types/events), [command](/docs/development/guides/resources/messages/message-types/commands), or [query](/docs/development/guides/resources/messages/message-types/queries) that already exists in your catalog.

The editor shows:

- The resource list on the left
- The resource documentation in the center
- Metadata and relationship fields around the editor

![Service resource open in EventCatalog Editor](./images/editor.png)

## Make a small change

Change a short paragraph, summary, [owner](/docs/owners), badge, or other low-risk field.

The editor writes changes back to your local catalog files. For example, editing a service updates the matching `index.mdx` file in your catalog.

You can use the rich editor for normal writing, or switch to source mode when you need to work directly with Markdown, MDX, or frontmatter.

## Preview the resource

Use **Open Preview** to view the resource in your running EventCatalog site.

![Open Preview button in EventCatalog Editor](./images/open-preview.png)

Preview opens the page from your local EventCatalog development server. If preview is unavailable, check that EventCatalog is running and that the editor detected the correct preview port.

## Review the change

Open **Changes** from the editor navigation.

The changes page groups local Git changes by EventCatalog resource. Open the changed file to inspect the diff.

![Changes page showing a local Git diff](./images/change-diff.png)

## Publish the change

When the diff looks right, click **Publish** in the editor.

In the beta editor, **Publish** commits your changes locally to Git. It does not deploy your catalog or open a pull request.

After publishing, continue with your team's normal review and release workflow. For example, you might push a branch and open a pull request, or push directly if that is how your catalog is maintained.

## What you learned

You have completed the core editor loop:

- Open a local catalog
- Edit a resource
- Preview the resource locally
- Review the Git diff
- Publish a local commit

Next, learn how to [edit resources](/docs/editor/how-to/edit-resource), [add schemas and specifications](/docs/editor/how-to/add-schemas-and-specifications), or [review and publish changes](/docs/editor/how-to/review-and-commit-changes).
