---
title: ADR-001 Adopt Event-Driven Architecture
summary: Decision to adopt an event-driven architecture for inter-service communication
---

## Status

Accepted

## Context

The E-Commerce domain requires multiple services (Orders, Inventory, Payments, Notifications) to communicate reliably. Direct synchronous calls between services create tight coupling and cascade failures when downstream services are unavailable.

## Decision

We will adopt an event-driven architecture using asynchronous messaging for inter-service communication. Services will publish domain events when state changes occur and subscribe to events they are interested in.

## Consequences

- **Positive:** Services are decoupled and can evolve independently
- **Positive:** Better fault tolerance as services can process events when they recover
- **Positive:** Natural audit trail of all state changes
- **Negative:** Eventual consistency requires careful handling in the UI
- **Negative:** Debugging distributed flows is more complex
