---
id: adr-015-use-order-fulfillment-metrics-data-product
name: "ADR-015: Publish fulfillment metrics as a data product"
summary: Fulfillment operational metrics are exposed through OrderFulfillmentMetrics instead of ad hoc service queries.
version: 1.0.0
status: accepted
date: 2024-11-19
owners:
  - order-management
decisionMakers:
  - order-management
appliesTo:
  - type: data-product
    id: OrderFulfillmentMetrics
  - type: flow
    id: ShipmentCreation
  - type: event
    id: ShipmentDelivered
  - type: event
    id: DeliveryFailed
related:
  - id: adr-013-publish-order-metrics-daily
---

## Context

Operations needs fulfillment lead time, failed delivery rate, and shipment backlog metrics. Pulling those metrics from service databases creates coupling and inconsistent definitions.

## Decision

Order fulfillment metrics are published through the `OrderFulfillmentMetrics` data product with documented grain and refresh behavior.

## Consequences

Operational reporting has a stable contract. Teams must evolve metrics through the data product contract rather than ad hoc queries.
