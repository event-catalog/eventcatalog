---
sidebar_position: 3
keywords:
    - components 
    - domains
sidebar_label: Components
title: Components
description: Component list for custom pages 
---

You can add custom EventCatalog components to your custom pages.

[See the list of components and how to use them](/docs/development/components/using-components).

You can also added components designed specifically for custom documentation.

### Embed EventCatalog Visualizer (NodeGraph)

In your custom documentation pages you can embed the EventCatalog Visualizer (NodeGraph) using the `NodeGraph` component.

![Example](./img/custom-docs-with-nodegraph.png)

This let's you embed any visualization (domain, service, message) into your custom documentation page.

To embed the NodeGraph component, you need to use the component, and pass in the `id` of the resource, `version` and `type`.

```md
This is my custom documentation page, here is a NodeGraph:

<!-- Here we embed the NodeGraph component, passing in the id, version and type of the resource -->
<!-- This exammple will render a domain called "Orders" with the version "1.0.0" -->
<NodeGraph id="Orders" version="1.0.0" type="domain" />

## Getting Started

Rest of my markdown content...
```

:::note Required props
In custom documentation pages, `id`, `version`, and `type` are all required. A `<NodeGraph />` missing any of these props is silently ignored.
:::

#### NodeGraph props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | The id of the resource (domain, service, or message) |
| `version` | string | Yes | The version of the resource |
| `type` | string | Yes | The type of the resource (domain, service, command, event, query) |
| `search` | boolean | No | Show or hide the search bar. Accepts `true`/`false` or `"true"`/`"false"`. Defaults to `true`. |
| `legend` | boolean | No | Show or hide the legend. Accepts `true`/`false` or `"true"`/`"false"`. Defaults to `true`. |
| `mode` | string | No | `"simple"` or `"full"`. Defaults to `"simple"`. |

