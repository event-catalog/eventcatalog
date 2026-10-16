---
sidebar_position: 2
keywords:
- EventCatalog architecture reference
- Export architecture documentation
- Single HTML file
sidebar_label: Architecture reference
title: Architecture reference
description: Export your whole catalog as one self-contained HTML file, on every build or with the CLI.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="5.1.0" />

The architecture reference is your whole catalog in one HTML file. Every domain, system, service, message, channel, data store, flow, entity and team gets its own section, linked to everything it relates to.

Use it for people who should see all of your architecture: your own teams in a design review, an architecture audit, or an AI agent that needs the full picture. For anyone who should see only part of it, [create a custom export](/docs/development/export/custom-exports) instead.

[See the demo architecture reference](https://demo.eventcatalog.dev/architecture.html)

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

The file shows when it was generated, and the command to generate it again.
