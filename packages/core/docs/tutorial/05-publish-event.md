---
sidebar_position: 5
sidebar_label: Publish from a service
slug: /tutorial/publish-event
title: Publish the event from a service
description: Update OrderService so EventCatalog knows it publishes OrderPlaced.
---

import ChapterOverview from '@site/src/components/MDX/ChapterOverview';

In this step, you will connect `OrderService` to the `OrderPlaced` event.

In EventCatalog, a service publishes an event by listing it under `sends`.

<ChapterOverview
  items={[
    {
      icon: 'server',
      text: 'Open the OrderService page.',
    },
    {
      icon: 'network',
      text: 'Add OrderPlaced to the sends list.',
    },
    {
      icon: 'eye',
      text: 'Refresh EventCatalog and inspect the relationship.',
    },
  ]}
/>

### Update the service

Open `services/OrderService/index.mdx` and add `sends` to the frontmatter:

```mdx title="services/OrderService/index.mdx"
---
id: OrderService
name: Order Service
version: 0.0.1
summary: |
  Handles customer orders from checkout through to fulfilment.
sends:
  - id: OrderPlaced
    version: 0.0.1
---
```

Keep the markdown content below the frontmatter as it is.

The `version` field inside `sends` is optional. If you leave it out, EventCatalog will use the latest version of the event.

### Check the relationship

Refresh EventCatalog in your browser and open the [Order Service page](http://localhost:3000/visualiser/services/OrderService/0.0.1).

You should now be able to see that `OrderService` publishes `OrderPlaced`. Open the event page as well. EventCatalog can now show the event and its producer as connected resources.

You can also open the `Map` view from the Order Service page to see the relationship visually.

<figure style={{ textAlign: "center" }}>
  <img
    src="/img/tutorial/order-service-publishes-order-placed-map.png"
    alt="The Order Service map showing that it publishes the Order Placed event"
    style={{ display: "block", margin: "0 auto" }}
  />
  <figcaption style={{ fontSize: "0.875rem", fontStyle: "italic" }}>The Order Service map showing the OrderPlaced publish relationship.</figcaption>
</figure>

We are only setting up the producer in this step. Next, you will add another service and connect it as a consumer with `receives`.

### What you have now

Your catalog now knows:

- `OrderPlaced` is an event.
- `OrderPlaced` has a schema.
- `OrderService` publishes `OrderPlaced`.

### Next

Continue to [Consume the event from a service](/docs/tutorial/consume-event).
