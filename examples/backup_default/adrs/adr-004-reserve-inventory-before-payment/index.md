---
id: adr-004-reserve-inventory-before-payment
name: "ADR-004: Reserve inventory before capturing payment"
summary: Checkout reserves stock before payment capture so customers are not charged for items that cannot be fulfilled.
version: 2.0.0
status: accepted
date: 2024-05-02
owners:
  - order-management
decisionMakers:
  - order-management
appliesTo:
  - type: flow
    id: PlaceOrder
  - type: flow
    id: InventoryReservation
  - type: service
    id: InventoryService
  - type: event
    id: OutOfStock
supersedes:
  - id: adr-004-reserve-inventory-before-payment
    version: 1.0.0
related:
  - id: adr-001-choose-event-driven-orders
badges:
  - content: Checkout
    backgroundColor: blue
    textColor: blue
---

## Context

The original checkout design authorized payment before inventory was reserved. During promotions this caused paid orders to be cancelled when stock could not be allocated.

## Decision

The checkout flow reserves inventory first. Payment capture only starts after InventoryService confirms a reservation for every shippable line item.

## Consequences

Payment failures no longer hold stock indefinitely because reservations expire. The checkout flow needs compensation logic to release reservations when payment cannot be completed.
