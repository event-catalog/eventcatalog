---
sidebar_position: 1
keywords:
- EventCatalog services
- Events
sidebar_label: Events
title: Events
description: What are events? Why are they useful for event-driven architectures?
---

Events are a type of message that represent immutable facts.

An example of an event would be `OrderPlaced` event.

- This event is a fact that an order has been placed.
- Other services (consumers) may be interested in this event and can typically subscribe to it.

### Events in EventCatalog

- Events in EventCatalog are orange (following [EventStorming conventions](https://www.eventstorming.com/))
- Events live in the `/events` folder.