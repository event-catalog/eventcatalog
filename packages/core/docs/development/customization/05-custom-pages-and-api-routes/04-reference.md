---
sidebar_position: 4
keywords:
  - EventCatalog custom pages reference
  - EventCatalog pages prefix
  - custom routes reference
sidebar_label: Reference
title: Custom pages and API routes reference
description: Route, file, and configuration reference for custom pages and API routes.
---

## Route prefix

Custom pages and API routes are served under `/custom` by default.

Use `pages.prefix` to serve them somewhere else.

```js title="eventcatalog.config.js"
export default {
  pages: {
    prefix: 'internal/tools',
  },
};
```

With this configuration:

| File | Route |
| --- | --- |
| `pages/reports.astro` | `/internal/tools/reports` |
| `pages/api/services.ts` | `/internal/tools/api/services` |

The prefix must use URL-safe characters: letters, numbers, `-`, and `_`, optionally separated with `/`.

The prefix cannot be empty.

Some top-level routes are reserved by EventCatalog. If a configured prefix conflicts with a reserved route, EventCatalog will ask you to choose a different prefix.

## Routable files

Code files in the top-level `pages` directory are treated as custom routes.

| Extension | Route type |
| --- | --- |
| `.astro` | Page |
| `.ts` | Endpoint |
| `.js` | Endpoint |
| `.mjs` | Endpoint |

Other files in `pages`, such as images, are copied as static assets. For example, `pages/diagram.png` can be referenced from `/generated/pages/diagram.png`.

## Route patterns

| File | Default route |
| --- | --- |
| `pages/reports.astro` | `/custom/reports` |
| `pages/reports/index.astro` | `/custom/reports` |
| `pages/reports/[id].astro` | `/custom/reports/[id]` |
| `pages/docs/[...slug].astro` | `/custom/docs/[...slug]` |
| `pages/api/teams.ts` | `/custom/api/teams` |
| `pages/data.json.ts` | `/custom/data.json` |

## Ignored files and folders

Files or folders that start with `_` are not treated as routes.

Use this for partials, helpers, and colocated components.

| File | Result |
| --- | --- |
| `pages/_partial.astro` | Ignored |
| `pages/_components/Card.astro` | Ignored |
| `pages/reports/_helpers.ts` | Ignored |
| `pages/reports/index.astro` | `/custom/reports` |

## Homepage exception

`pages/homepage.astro` is rendered as the catalog homepage at `/`.

It is not served as `/custom/homepage`.

## Server mode

Custom pages can be used in static or server output.

Custom API routes require server mode for production builds.

```js title="eventcatalog.config.js"
export default {
  output: 'server',
};
```

If EventCatalog finds API routes in `pages/api` during a static build, the build fails and asks you to enable server mode or remove the `pages/api` directory.

## Import aliases

Use these aliases in custom pages.

| Alias | Description |
| --- | --- |
| `@catalog/layouts/Layout.astro` | Stable EventCatalog layout shell for custom pages. |
| `@catalog/utils` | Stable catalog data helpers such as `getServices`, `getDomains`, and `getEvents`. |
| `@catalog/components/*` | Components from your catalog's top-level `components` directory. |

## `@catalog/utils`

Use `@catalog/utils` to read catalog resources from custom pages and API routes.

```js title="pages/reports.astro"
---
import { getServices, getDomains } from '@catalog/utils';

const services = await getServices({ getAllVersions: false });
const domains = await getDomains({ getAllVersions: false });
---
```

Getter functions return hydrated, cached collection entries. Pass `{ getAllVersions: false }` when you only want the latest version of each resource.

| Helper | Returns |
| --- | --- |
| `getDomains` | Domains |
| `getServices` | Services |
| `getSystems` | Systems |
| `getEvents` | Events |
| `getCommands` | Commands |
| `getQueries` | Queries |
| `getFlows` | Flows |
| `getChannels` | Channels |
| `getEntities` | Entities |
| `getAgents` | Agents |
| `getContainers` | Containers |
| `getDataProducts` | Data products |
| `getAdrs` | Architecture decision records |
| `getTeams` | Teams |
| `getUsers` | Users |
| `getItemsFromCollectionByIdAndSemverOrLatest` | A specific version, semver range, or latest item from a collection |
