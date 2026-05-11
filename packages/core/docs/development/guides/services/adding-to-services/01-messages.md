---
keywords:
- EventCatalog domains
sidebar_label: Messages
title: Adding messages to services
description: Understanding how to add messages to services.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

EventCatalog supports different types of messages ([commands](/docs/development/guides/messages/commands/introduction), [events](/docs/development/guides/messages/events/introduction) and [queries](/docs/development/guides/messages/queries/introduction)).

A service in EventCatalog can **receive** or **send** messages. 

A service can also **send** and **receive** messages through channels.

![Example](../../img/services/example.png)


:::info What about producers and consumers?

If you are coming from an event-driven architecture you will be familiar with the terms producers and consumers. Producers produce events and consumers consume them.


EventCatalog services can be either producers or consumers or both. For example if a service receives an event (type of message) it is the consumer, if it sends an event (type of message) it is the producer.


The idea of **sends** and **receives** comes from the [AsyncAPI specification](https://www.asyncapi.com/blog/release-notes-3.0.0) and gives flexibility to support other types of messages (commands and queries).

:::

To add messages to your service you first have to define your messages.

Once you have messages defined in your Catalog you can reference them within your service.

## Adding messages to your service

To add messages to a service you need to define them in either the **sends** or **receives** array within your service frontmatter API.

You need to add the `id` of the message and optionally the `version` of the message.

```md title="/services/Orders/index.mdx (example)"
---
id: OrderService
... # other service frontmatter
receives:
    # id of the message this service receives
    - id: PaymentProcessed
    # (optional) The version of the message you want to add.
    # If no version is given the latest version of the message will be used.
      version: 0.0.1
sends:
    # id of the message this service sends
    - id: OrderProcessed
      version: 2.0.1
---

<!-- Markdown contents... -->

```

The **receives** and **sends** fields in your service tell EventCatalog which messages this service either consumes or publishes.  

:::info The power of versioning
  When you define your messages for your service you can define the version of them too. This can be powerful if you have multiple versions of your events, commands or queries. Example could be an API that you are consuming, maybe you are consuming an old version of this API you can specify that.
:::

### Declaring field dependencies

<AddedIn version="3.24.0" />

You can declare which specific fields of a message your service depends on by adding a `fields` array to any `receives` entry.

```md title="/services/Orders/index.mdx (example)"
---
id: OrderService
... # other service frontmatter
receives:
  - id: PaymentProcessed
    version: 1.0.0
    fields:
      - orderId
      - amount
      - currency
---
```

Declaring fields is optional. When at least one service declares fields for a message, EventCatalog generates a **Field Usage** page for that message showing which services depend on each field. You can read more in the [Field Usage guide](/docs/development/guides/schemas/field-usage).

### Routing messages through channels

You can also route your messages through channels. Examples of these could be your brokers, queues, topics, etc.

To do this you can use the `to` and `from` fields in your service frontmatter.

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
      - id: orders.events

# Service consumes a message called PaymentProcessed
# This message is consumed from the payments.events channel (e.g queue)
receives:
  - id: PaymentProcessed
    from:
      - id: payments.events
---
```

You can read more about routing messages through channels in the [routing messages through channels guide](/docs/development/guides/channels/introduction).


### Using semver versioning

<AddedIn version="2.4.0" />

You can use [semver](https://semver.org/) syntax when referencing your services in your domains.

```md title="/domains/Orders/index.mdx (example)"
---
id: PaymentDomain
... # other domain frontmatter
services:
    # Latest minor version of PaymentsService will be added
    - id: PaymentsService
      version: 0.x.1
    # Minor and patches of this version will be linked
    - id: NotificationsService
      version: ^1.0.1
    # Latest version of this service will be shown by default.
    - id: PaymentsService
---

---
id: OrderService
... # other service frontmatter
receives:
    # Service receives a message called PaymentProcessed
    # The latest minor/patch version of this event will be used
    - id: PaymentProcessed
      version: 1.x.x
sends:
    # Service sends a message called OrderProcessed
    # This pulls the latest patch version of OrderProcessed
    - id: OrderProcessed
      version: 2.0.x
    # Service sends a message called OrderCancelled
    # This pulls the latest minor/patch version of OrderCancelled
    - id: OrderCancelled
      version: >1.0.1
---

<!-- Markdown contents... -->

```

Although it's recommended to link to a version of a message it is now optional. If no version is given **latest** is used by default.

### Group messages in the visualiser

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

![Message group expanded in the visualiser](../../img/services/message-group-expanded.png)

Click the group node to expand it. The expanded view renders each individual message inside a container, along with the full downstream graph: channels the messages route to and any connected producer or consumer services, exactly as they would appear when ungrouped. Click **Collapse** inside the expanded container to return to the compact group node.

![Message group expanded in the visualiser](../../img/services/expanding-groups.png)

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
```

### Visualizing messages within a service

When messages get added within your services EventCatalog will visualize this for you either using the `NodeGraph` component or through the visualizer.

![Example](../../img/services/visualiser.png)
