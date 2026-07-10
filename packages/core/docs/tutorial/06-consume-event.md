---
sidebar_position: 6
sidebar_label: Consume from a service
slug: /tutorial/consume-event
title: Consume the event from a service
description: Create InventoryService and mark it as a consumer of OrderPlaced.
---

import ChapterOverview from '@site/src/components/MDX/ChapterOverview';

In this step, you will create `InventoryService` and connect it to the `OrderPlaced` event.

In EventCatalog, a service consumes an event by listing it under `receives`.

<ChapterOverview
  items={[
    {
      icon: 'server',
      text: 'Create the InventoryService page.',
    },
    {
      icon: 'network',
      text: 'Add OrderPlaced to the receives list.',
    },
    {
      icon: 'eye',
      text: 'Refresh EventCatalog and inspect the full relationship.',
    },
  ]}
/>

### Create the service folder

From the root of your catalog, create a new folder for the service:

```bash
mkdir -p services/InventoryService
```

### Add the service page

Create a new file at `services/InventoryService/index.mdx` and add `receives` to the frontmatter:

```mdx title="services/InventoryService/index.mdx"
---
id: InventoryService
name: Inventory Service
version: 0.0.1
summary: |
  Tracks stock levels and reserves inventory for customer orders.
receives:
  - id: OrderPlaced
    version: 0.0.1
---

## Overview

The inventory service tracks product avaliability and reservces stock when a customer places an order.

```

Keep the markdown content below the frontmatter as it is.

The frontmatter follows the same shape as `OrderService`:

- `id` is the stable identifier EventCatalog uses for links and references.
- `name` is the label people see in the UI.
- `version` is the version of this service.
- `summary` appears in service lists and page headers.
- `receives` lists the events this service consumes.

The `version` field inside `receives` is optional. If you leave it out, EventCatalog will use the latest version of the event.

### Check the service in EventCatalog

Refresh EventCatalog in your browser. You should now be able to find `InventoryService` in your catalog.

<figure style={{ textAlign: "center" }}>
  <img
    src="/img/tutorial/inventory-service-page.png"
    alt="The Inventory Service page in EventCatalog"
    style={{ display: "block", margin: "0 auto" }}
  />
  <figcaption style={{ fontSize: "0.875rem", fontStyle: "italic" }}>The Inventory Service page after adding the service file.</figcaption>
</figure>

### Check the relationship

Refresh EventCatalog in your browser and open the `OrderPlaced` event page.

You should now be able to see both sides of the event:

- `OrderService` publishes `OrderPlaced`.
- `InventoryService` consumes `OrderPlaced`.

Open the `Map` view from the event page to see the relationship visually.

<figure style={{ textAlign: "center" }}>
  <img
    src="/img/tutorial/order-placed-producer-consumer-map.png"
    alt="The OrderPlaced event map showing OrderService as producer and InventoryService as consumer"
    style={{ display: "block", margin: "0 auto" }}
  />
  <figcaption style={{ fontSize: "0.875rem", fontStyle: "italic" }}>The OrderPlaced map showing OrderService publishing the event and InventoryService consuming it.</figcaption>
</figure>

:::tip Show the visualizer on the page
You can embed the same kind of visualization directly into a documentation page with the [`NodeGraph`](/docs/development/components/components/nodegraph) component:

```mdx
<NodeGraph />
```

When used on a service or event page, `NodeGraph` renders the graph for the current resource.
:::

### What you have now

Your catalog now knows:

- `OrderPlaced` is an event.
- `OrderPlaced` has a schema.
- `OrderService` publishes `OrderPlaced`.
- `InventoryService` consumes `OrderPlaced`.

This is the first complete event relationship in the tutorial catalog.

### Next

Continue to [Add ownership](/docs/tutorial/add-ownership).
