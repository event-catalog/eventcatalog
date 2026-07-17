---
keywords:
- EventCatalog command events
- command outcomes
- map commands to events
sidebar_label: Map commands to events
title: Map commands to events
description: Document which events a command can trigger, including the events produced in different scenarios.
sidebar_position: 2
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="4.2.0" />

Commands often produce one of several events. For example, a `CreateOrder` command may produce `OrderCreated` when it succeeds or `OrderRejected` when it fails.

EventCatalog lets you document these relationships so teams can see which events to expect from a command and which commands can produce a specific event.

![Cancel Order command mapped to the Order Cancelled event through the Order Service](./imgs/cancel-order-command-to-event.png)

## Connect a command to events

Commands are `received` from particular resources in EventCatalog (e.g services). When you receive a command, you can also specify what events are triggered downstream, you do this by using the `triggers` property.

In the example below, the `OrderService` receives the `CreateOrder` (command) and we also specify that htis command is linked to and triggers the `OrderCreated` and `OrderRejected` event.


```md title="/services/OrderService/index.mdx"
---
id: OrderService
version: 1.0.0
name: Order service
receives:
  # receives the CreateOrder Command
  - id: CreateOrder
    version: 1.0.0
    # Tell EventCatalog that the CreateOrderCommand
    # in this context will trigger the OrderCreated and Rejeected events.
    triggers:
      - id: OrderCreated
        version: 1.0.0
      - id: OrderRejected
        version: 1.0.0
---
```

The command and every event it triggers must already exist in your catalog before EventCatalog can resolve the relationship.

## Describe different scenarios

Add an optional `condition` to explain the scenario in which an event is produced. Conditions are useful for success and failure outcomes, business-rule branches, or different paths that produce the same event.

```md title="/services/OrderService/index.mdx"
---
id: OrderService
version: 1.0.0
name: Order service
receives:
  - id: CreateOrder
    version: 1.0.0
    triggers:
      - id: OrderCreated
        version: 1.0.0
        # specify the scenario when this event would be triggered
        condition: When payment is authorized and stock is available
---
```

This lets you document common command-handling scenarios such as:

- A command producing a success event or a failure event.
- A command producing different events based on a business rule.
- Multiple paths producing the same event for different reasons.
- Different services producing different events from the same command.

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `id` | `string` | Yes | Id of the event produced by the command. |
| `version` | `string` | No | Version or semver range of the event. Defaults to `latest`. |
| `condition` | `string` | No | Scenario in which the command produces the event. |

The `version` on the received command also defaults to `latest` when omitted.

## Explore command and event relationships

The command page lists its events under **Triggers**. Each event page lists the commands that can produce it under **Triggered by**. Message maps also show the command, the resource handling it, and the resulting events.

The example below shows the `Cancel Order` command mapped to the `Order Cancelled` event through the `Order Service`, including the scenario in which the event is produced.

![Cancel Order command mapped to the Order Cancelled event through the Order Service](./imgs/cancel-order-command-to-event.png)

Select **Map commands to events** under **Architecture** to compare these relationships. EventCatalog draws each command-to-event path through the receiving service or domain and groups repeated paths into selectable scenarios.

The **Map commands to events** link is only generated for messages that participate in at least one resolved relationship.
