---
id: adr-011-route-shipping-through-shipping-service
name: "ADR-011: Route fulfillment changes through ShippingService"
summary: Shipment commands and status changes are owned by ShippingService instead of being coordinated directly from OrdersService.
version: 1.0.0
status: accepted
date: 2024-10-22
owners:
  - order-management
decisionMakers:
  - order-management
appliesTo:
  - type: service
    id: ShippingService
  - type: command
    id: CreateShipment
  - type: command
    id: UpdateShipmentStatus
  - type: flow
    id: ShipmentCreation
related:
  - id: adr-001-choose-event-driven-orders
badges:
  - content: Fulfillment
    backgroundColor: blue
    textColor: blue
---

## Context

Shipping integrations have provider-specific labels, carrier status mappings, and retry behavior. OrdersService should not own that complexity.

## Decision

OrdersService emits order lifecycle events and sends shipment requests through ShippingService contracts. ShippingService owns shipment state and carrier-specific mapping.

## Consequences

Fulfillment can evolve independently from order capture. OrdersService only observes shipment outcomes through events.
