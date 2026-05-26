---
id: adr-004-reserve-inventory-before-payment
name: "ADR-004: Authorize payment before reserving inventory"
summary: The first checkout design authorized payment before inventory reservation.
version: 1.0.0
status: superseded
date: 2023-11-17
owners:
  - order-management
decisionMakers:
  - order-management
appliesTo:
  - type: flow
    id: PlaceOrder
  - type: service
    id: PaymentService
  - type: service
    id: InventoryService
supersededBy:
  - id: adr-004-reserve-inventory-before-payment
    version: 2.0.0
badges:
  - content: Checkout
    backgroundColor: gray
    textColor: gray
---

## Context

Early checkout work optimized for fast payment confirmation and deferred stock allocation to the fulfillment workflow.

## Decision

Payment authorization happened before inventory reservation.

## Consequences

The approach produced poor customer outcomes when stock was exhausted after payment authorization. It has been superseded by reserving inventory before capture.
