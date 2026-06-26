---
id: adr-012-make-delivery-failure-retriable
name: "ADR-012: Treat delivery failure as terminal"
summary: The early fulfillment design treated delivery failure as a terminal shipment state.
version: 0.9.0
status: superseded
date: 2024-04-29
owners:
  - order-management
decisionMakers:
  - order-management
appliesTo:
  - type: event
    id: DeliveryFailed
  - type: service
    id: ShippingService
supersededBy:
  - id: adr-012-make-delivery-failure-retriable
    version: 1.0.0
badges:
  - content: Fulfillment
    backgroundColor: gray
    textColor: gray
---

## Context

The initial implementation used `DeliveryFailed` to close the shipment workflow immediately.

## Decision

Delivery failure was treated as terminal.

## Consequences

Support teams had to create new shipments manually for recoverable carrier issues. This decision has been superseded by a retriable failure state.
