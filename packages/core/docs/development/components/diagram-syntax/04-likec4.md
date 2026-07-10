---
sidebar_position: 4
keywords:
- likec4
- diagrams
- architecture
- c4
sidebar_label: LikeC4
title: Using LikeC4
description: Embed LikeC4 architecture diagrams in EventCatalog pages
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.47.2" />

EventCatalog supports embedding [LikeC4](https://likec4.dev) diagrams in all your markdown files via the `<LikeC4View />` component.

LikeC4 is an architecture-as-code tool that lets you model and visualize your system landscape using `.c4` source files. Views defined in those files can be rendered directly inside EventCatalog documentation pages.

## Install dependencies

LikeC4 support is opt-in. Add the required packages as dev dependencies in your EventCatalog project:

```bash
# npm
npm install --save-dev likec4@1.55.1 @likec4/icons@1.46.4

# pnpm
pnpm add -D likec4@1.55.1 @likec4/icons@1.46.4

# yarn
yarn add -D likec4@1.55.1 @likec4/icons@1.46.4
```

EventCatalog uses React 18, so install `likec4@1.55.1`. Newer LikeC4 versions may require React 19.

EventCatalog auto-detects `.c4` files in your project. When it finds them it loads the LikeC4 Vite plugin automatically. If `.c4` files are present but the `likec4` package is not installed, EventCatalog will show an install message at startup.

## Basic usage

Add `.c4` source files anywhere in your EventCatalog project (outside `node_modules`), then reference a view by its id using `<LikeC4View />` in any markdown file.

```likec4 /likec4/order-flow.c4
specification {
  element actor {
    style {
      shape person
    }
  }
  element system
}

model {
  customer = actor 'Customer'
  ordering = system 'Ordering service'
  payment = system 'Payment service'
  fulfillment = system 'Fulfillment service'

  customer -> ordering 'places order'
  ordering -> payment 'authorizes payment'
  ordering -> fulfillment 'requests shipment'
}

views {
  view OrderFlow {
    include *
    autoLayout LeftRight
  }
}
```

```md /events/OrderCreated/index.mdx
---
# event frontmatter
---

<LikeC4View viewId="OrderFlow" height={300} />
```

## Multi-project setup

When your workspace contains more than one LikeC4 project, each project needs a `likec4.config.json` file with a `name` field. EventCatalog reads these files at build time and registers each named project separately.

```json likec4.config.json
{
  "name": "payments"
}
```

A common layout is to keep each project in its own folder, with the `likec4.config.json` alongside the `.c4` files that belong to it. EventCatalog scans your whole project (outside `node_modules`), so you can place these folders wherever makes sense for your catalog:

```
your-catalog/
├── eventcatalog.config.js
├── likec4/
│   ├── payments/
│   │   ├── likec4.config.json    # { "name": "payments" }
│   │   ├── model.c4
│   │   └── views.c4
│   └── orders/
│       ├── likec4.config.json    # { "name": "orders" }
│       ├── model.c4
│       └── views.c4
├── services/
│   └── PaymentsService/
│       └── index.mdx             # <LikeC4View viewId="..." project="payments" />
└── events/
    └── OrderCreated/
        └── index.mdx
```

Pass the `project` prop to load a view from a specific project:

```md /services/PaymentsService/index.mdx
---
# service frontmatter
---

<LikeC4View viewId="PaymentsOverview" project="payments" />
```

When `project` is omitted, the component uses the default (unnamed) project.

## Props

| Name      | Type     | Default  | Required | Description                                                                   |
| --------- | -------- | -------- | -------- | ----------------------------------------------------------------------------- |
| `viewId`  | `string` |          | Yes      | The id of the LikeC4 view to render.                                          |
| `project` | `string` |          | No       | The name of the LikeC4 project (from `likec4.config.json`). Defaults to the default project. |
| `height`  | `string` | `600px`  | No       | CSS height of the embedded diagram.                                           |

## More resources

- [LikeC4 documentation](https://likec4.dev/docs/) - Learn how to model your architecture with LikeC4
- [LikeC4 view syntax](https://likec4.dev/docs/dsl/views/) - Reference for defining views in `.c4` files
