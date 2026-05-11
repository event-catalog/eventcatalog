---
sidebar_position: 1
keywords:
- EventCatalog services
- Events
sidebar_label: What are events?
title: Understanding events
description: What are events? Why are they useful for event-driven architectures?
---

Events are a type of message that represent immutable facts.

In EventCatalog [Services](/docs/development/guides/services/introduction) may send (produce) or receive (consume) events in your architecture.

### Example of an event

An example of an event would be `OrderPlaced` event.

- This event is a fact that an order has been placed.
- Other services (consumers) may be interested in this event and can typically subscribe to it.

### Events in EventCatalog

- Events in EventCatalog are orange (following [EventStorming conventions](https://www.eventstorming.com/))
- Events live in the `/events` folder or inside a [service](/docs/development/guides/services/introduction) folder.