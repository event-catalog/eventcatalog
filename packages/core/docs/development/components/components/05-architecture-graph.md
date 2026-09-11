---
sidebar_position: 5
keywords:
- components
- architecture graph
- force-directed graph
sidebar_label: ArchitectureGraph
title: ArchitectureGraph
description: Component for embedding the catalog-wide architecture graph into your documentation
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="4.10.1" />

A component that renders the [architecture graph](/docs/development/guides/architecture-graph) (the force-directed graph of your whole catalog from `/visualiser/graph`) inside your documentation pages, focused on the resource you are documenting.

The `<ArchitectureGraph/>` component is supported in domains, services, systems, all messages, and custom documentation pages.

Unlike [`<NodeGraph/>`](/docs/development/components/components/nodegraph) (which renders one resource's diagram), `<ArchitectureGraph/>` shows where the resource sits in your whole architecture — its neighbourhood inside the catalog graph, with clustering, focus rings, and search.

### Example

```md /domains/Orders/index.mdx
<!-- Without any properties, this renders the architecture graph focused on the current resource -->
<ArchitectureGraph />

<!-- Focus another resource -->
<ArchitectureGraph id="InventoryService" type="service" />

<!-- Show more of the architecture around the resource (1–3 relationship hops) -->
<ArchitectureGraph depth="3" />

<!-- Render a specific lens of the whole catalog -->
<ArchitectureGraph lens="messages" />
```

#### Output

![Example output](./img/architecture-graph.png)

Readers can click any node to focus it, double-click to open its documentation, and use the search to jump to any resource — the same interactions as the full-page architecture graph. Scrolling over the graph scrolls the page; hold `ctrl`/`cmd` while scrolling to zoom.

#### Props

| Name                    | Type      | Default           | Description                                                       |
| ----------------------- | --------- | ----------------- | ----------------------------------------------------------------- |
| `id` (optional)         | `string`  | Current page's resource | The id of the resource to focus. Use together with `type`. |
| `type` (optional)       | `string`  | Current page's type | The type of the resource to focus (e.g. `domain`, `service`, `event`). |
| `depth` (optional)      | `string`  | `"2"`             | How many relationship hops to render around the focused resource (1–3). |
| `lens` (optional)       | `string`  | `"all"`           | The lens to render: `all`, `domains`, `systems`, `services`, `teams` or `messages`. |
| `search` (optional)     | `boolean` | `true`            | Show or hide the search bar. Accepts `true`/`false` or `"true"`/`"false"`. |
| `legend` (optional)     | `boolean` | `true`            | Show or hide the resources legend. Accepts `true`/`false` or `"true"`/`"false"`. |
| `lensPicker` (optional) | `boolean` | `false`           | Show the lens picker so readers can switch between views (domains, systems, services, teams, message flow). Accepts `true`/`false` or `"true"`/`"false"`. |
| `maxHeight` (optional)  | `string`  | `30`              | Max height (em) of the graph in your document. |

The graph always shows the latest version of each resource, so no `version` prop is needed.

:::info Custom documentation pages
On custom documentation pages there is no "current resource", so `<ArchitectureGraph/>` without `id` and `type` renders the whole catalog graph.
:::

:::tip Open full screen
When the [full-page architecture graph is enabled](/docs/development/guides/architecture-graph#turn-on-the-graph) (`visualiser.architectureGraph.enabled` in your `eventcatalog.config.js`), the embedded graph shows an **Open full screen** link to `/visualiser/graph` that carries the current view state — the focused resource, selected depth, and lens — so the full page opens on exactly what the reader is looking at. The embedded component itself works without that flag.
:::
