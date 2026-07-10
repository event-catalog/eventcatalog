---
sidebar_position: 1
keywords:
- EventCatalog services
- Commands
sidebar_label: Commands
title: Commands
description: What are commands? Why are they useful for event-driven architectures?
---

Commands are messages that represent intent, commands can be rejected in distributed systems.

In EventCatalog [Services](/docs/development/guides/resources/services/introduction) may invoke (send) or accept (receive) commands in your architecture.

An example of a command would be `PlaceOrder` message over HTTP.

- This message is used to place an order in a system
- Commands can be rejected, the `PlaceOrder` may be rejected by the service that processes it.

### Commands in EventCatalog

- Commands in EventCatalog are blue (following [EventStorming conventions](https://www.eventstorming.com/))
- Commands live in the `/commands` folder.
