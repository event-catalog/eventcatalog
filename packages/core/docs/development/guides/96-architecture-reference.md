---
sidebar_position: 96
keywords:
- EventCatalog architecture reference
- Export architecture documentation
- Single HTML file
- Share architecture
sidebar_label: Architecture Reference
title: Architecture reference
description: Export your whole catalog as one self-contained HTML file you can share, attach or host anywhere.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="5.1.0" />

The architecture reference is your whole catalog in **one self-contained HTML file**. Every domain, system, service, message, channel, data store, flow, entity and team gets its own section, linked to everything it relates to.

It doesn't need a server: everything is in the file, so you can attach it to an email, add it to a design review, keep it with an audit, or host it next to your catalog.

![The overview of an architecture reference, listing the domains, systems and services in the sidebar and a summary of the catalog](./img/architecture-reference-overview.png)

[See demo architecture reference](https://demo.eventcatalog.dev/architecture.html)

## What's in it

- **An overview of the catalog**, with how many of each resource it documents.
- **A section for every resource**, with its summary, owners, badges and documentation (including mermaid diagrams).
- **Relationships on every section**: who produces and consumes a message, what a service sends and receives, which services read and write a data store, what lives inside a domain or system. Every relationship is a link.
- **Message attributes** from your JSON Schema, Avro and Protobuf schemas, with an example payload, a TypeScript type and the raw schema.
- **Your specifications** (OpenAPI, AsyncAPI and GraphQL), which you can view and download from the page.
- **Flows**, step by step, with every resource each step touches.
- **Search** across the document (press `⌘K` or `Ctrl+K`), a sidebar filter, and light and dark themes.

Only the latest version of each resource is included. Resources marked as hidden are left out.

![A message in the architecture reference, with its attributes, producers, consumers and an example payload](./img/architecture-reference-message.png)

## Get it on every build

The reference is generated every time you build your catalog. You don't need to set anything up.

```bash
npm run build
```

It is written to `dist/architecture.html`, or to `dist/client/architecture.html` when your catalog [runs in server mode](/docs/development/deployment/build-ssr-mode). Wherever you host your catalog, the reference is available at `/architecture.html`.

### Turn it off

Set `exports.html.enabled` to `false` in your `eventcatalog.config.js` file:

```js title="eventcatalog.config.js"
module.exports = {
  exports: {
    html: {
      enabled: false,
    },
  },
};
```

### Catalogs with authentication

If your catalog uses [authentication](/docs/development/authentication/introduction), the reference is **not** generated unless you turn it on. Files in the build output are served without the authentication checks, so anyone who knows the URL could read it.

To generate it anyway, set `exports.html.enabled` to `true`.

## Export it with the CLI

Use the [`export` command](/docs/cli/cli-export) of the [EventCatalog CLI](/docs/cli) to export the reference on demand, without building the catalog. From the root of your catalog, run:

```bash
npx @eventcatalog/cli export --format html
```

This writes `architecture.html` and opens it in your browser.

| Option | Description |
| --- | --- |
| `--output <path>` | Where to write the file. Defaults to `architecture.html` |
| `--no-open` | Don't open the reference in your browser (useful in CI) |
| `--dir <path>` | Path to your catalog, if you aren't running the command from it |

For example, to export the reference in a CI pipeline and publish it as a build artifact:

```bash
npx @eventcatalog/cli export --format html --output reports/architecture.html --no-open
```

## Sharing the reference

The reference uses the `title`, `organizationName` and `logo` from your `eventcatalog.config.js` file. When you share a link to a hosted reference in Slack, Teams or on social media, the preview shows the catalog's name and what it documents.

The file shows when it was generated, and the command to generate it again.
