---
id: adr-012-make-delivery-failure-retriable
name: "ADR-012: Treat delivery failure as a retriable fulfillment state"
summary: Delivery failures are modeled as recoverable states so support and automation can retry, redirect, or cancel shipments.
version: 1.0.0
status: accepted
date: 2024-11-07
owners:
  - order-management
decisionMakers:
  - order-management
appliesTo:
  - type: event
    id: DeliveryFailed
  - type: service
    id: ShippingService
  - type: command
    id: UpdateShipmentStatus
  - type: event
    id: ShipmentInTransit
supersedes:
  - id: adr-012-make-delivery-failure-retriable
    version: 0.9.0
badges:
  - content: Fulfillment
    backgroundColor: green
    textColor: green
---

## Context

Carrier delivery failures can be temporary, such as customer unavailable or address correction needed. Treating all failures as terminal created unnecessary cancellations.

## Decision

`DeliveryFailed` represents a retriable state with reason codes. Support tooling can trigger redelivery, address correction, return, or cancellation.

## Consequences

Fulfillment state machines need explicit retry limits. Customer notifications can provide more accurate next steps.
