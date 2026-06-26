---
id: adr-001-choose-event-driven-orders
name: "ADR-001: Choose event-driven order processing"
summary: Orders are processed through domain events so payment, inventory, and shipping can evolve independently.
version: 1.0.0
status: accepted
date: 2026-05-26
owners:
  - order-management
decisionMakers:
  - order-management
appliesTo:
  - type: domain
    id: Orders
  - type: service
    id: OrdersService
  - type: event
    id: OrderConfirmed
badges:
  - content: Messaging
    backgroundColor: blue
    textColor: blue
---

## Context

Order processing coordinates payment, inventory, fulfillment, and customer notifications. A synchronous workflow would couple
these capabilities to the order service and make downstream changes harder to release independently.

## Decision

The Orders domain will publish domain events for important order lifecycle changes. Downstream services consume those events and
own their local processing, retries, and failure handling.

## Consequences

Teams can add or change downstream processing without changing the order service contract for every workflow change. Consumers
must handle eventual consistency and duplicate event delivery.
