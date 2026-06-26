---
id: adr-002-use-outbox-for-order-events
name: "ADR-002: Use the transactional outbox for order events"
summary: Order lifecycle events are written to an outbox in the order database before being published to the domain event bus.
version: 1.0.0
status: accepted
date: 2024-03-12
owners:
  - order-management
decisionMakers:
  - order-management
appliesTo:
  - type: service
    id: OrdersService
  - type: container
    id: orders-db
  - type: channel
    id: orders-domain-eventbus
  - type: event
    id: OrderConfirmed
related:
  - id: adr-001-choose-event-driven-orders
badges:
  - content: Reliability
    backgroundColor: green
    textColor: green
---

## Context

Order events must be published reliably when the order write succeeds. Publishing directly from the request path creates a failure window where the database commit succeeds but event publication fails.

## Decision

OrdersService will write order events to an outbox table in `orders-db` in the same transaction as the aggregate update. A background publisher reads the outbox and publishes to the orders domain event bus.

## Consequences

The order write path remains consistent and event publication can be retried independently. Consumers must tolerate small publication delays and duplicate delivery.
