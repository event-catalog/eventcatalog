---
keywords:
- EventCatalog domains
sidebar_position: 1
sidebar_label: Add messages to services
title: Add messages to services
description: Understanding how to add messages to services.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

A service in EventCatalog can **receive** (consume) or **send** (produce) messages ([commands](/docs/development/guides/resources/messages/message-types/commands), [events](/docs/development/guides/resources/messages/message-types/events) and [queries](/docs/development/guides/resources/messages/message-types/queries)). 

![Example](../../../img/services/example.png)

## Producing and consuming messages from your service

To add messages to your service you first have to define your messages, if you don't have any messages you can create one.

To add messages to a service you need to define them in either the **sends** or **receives** array within your service frontmatter API.

```md title="/services/Orders/index.mdx (example)"
---
id: OrderService
... # other service frontmatter
receives:
    # id of the message this service receives (consumes)
    - id: PaymentProcessed
    # (optional) The version of the message you want to add.
    # Supports semver matching (e.g ^1.0.1, 1.x.x). 
    # But if no version is given the latest version of the message will be used.
      version: 0.0.1
sends:
    # id of the message this service sends (produces)
    - id: OrderProcessed
      version: 2.x.x
---

<!-- Markdown contents... -->

```

:::info The power of versioning
  When you define your messages for your service you can define the version of them too. This can be powerful if you have multiple versions of your events, commands or queries. Example could be an API that you are consuming, maybe you are consuming an old version of this API you can specify that.
:::

### Routing messages through channels

Messages may also travel through [channels](https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageChannel.html) (e.g message brokers, queues, buses).

To specify a channel you need to use the `to` and `from` fields in your service frontmatter.

This example shows :
- the `OrderService` sending an `OrderPlaced` message to the `orders.events` channel.
- the `OrderService` consuming the a `PaymentProcessed` message from the `payments.events` channel.

```md title="/services/Orders/index.mdx (example)"
---
id: OrderService
... # other service frontmatter

# Service sends a message called OrderPlaced
# This message is published to the orders.events channel (e.g broker)
sends:
  - id: OrderPlaced
    to:
      # The id of the channel (e.g queue)
      - id: orders.events

# Service consumes a message called PaymentProcessed
# This message is consumed from the payments.events channel (e.g queue)
receives:
  - id: PaymentProcessed
    from:
      # The id of the channel (e.g bus)
      - id: payments.events
---
```

You can read more about routing messages through channels in the [routing messages through channels guide](/docs/development/guides/resources/messages/message-channels/introduction).


<!-- ### Group messages in the visualiser

<AddedIn version="3.27.0" />

When a service sends or receives many messages, the visualiser can become crowded. You can use the `group` field on any `sends` or `receives` entry to collect related messages into a named group node.

```md title="/services/WarehouseService/index.mdx (example)"
---
id: WarehouseService
version: 1.0.0
name: Warehouse Service
sends:
  - id: ShipmentDispatched
    version: 1.0.0
    group: Shipping
  - id: ShipmentFailed
    version: 1.0.0
    group: Shipping
  - id: PickRequested
    version: 1.0.0
    group: Picking
receives:
  - id: OrderPlaced
    version: 1.0.0
    group: Orders
---
```

Messages that share the same `group` value are collapsed into a single stacked (purple) card node in the visualiser. The node displays the group name and the number of messages it contains.

![Message group expanded in the visualiser](../../../img/services/message-group-expanded.png)

Click the group node to expand it. The expanded view renders each individual message inside a container, along with the full downstream graph: channels the messages route to and any connected producer or consumer services, exactly as they would appear when ungrouped. Click **Collapse** inside the expanded container to return to the compact group node.

![Message group expanded in the visualiser](../../../img/services/expanding-groups.png)

Groups can be combined with channel routing. The expanded view will show the correct channel paths for each message.

```md title="/services/WarehouseService/index.mdx (example)"
---
id: WarehouseService
version: 1.0.0
name: Warehouse Service
sends:
  - id: ShipmentDispatched
    version: 1.0.0
    group: Shipping
    to:
      - id: shipping.events
  - id: ShipmentFailed
    version: 1.0.0
    group: Shipping
---
``` -->

<!-- ### Visualizing messages within a service

When messages get added within your services EventCatalog will visualize this for you either using the `NodeGraph` component or through the visualizer.

![Example](../../../img/services/visualiser.png) -->
