---
id: adr-013-publish-order-metrics-daily
name: "ADR-013: Publish order metrics once per day"
summary: OrderAnalytics publishes daily order metrics rather than streaming every operational change into analytical consumers.
version: 1.0.0
status: accepted
date: 2024-12-04
owners:
  - order-management
decisionMakers:
  - order-management
appliesTo:
  - type: data-product
    id: OrderAnalytics
  - type: event
    id: OrderMetricsCalculated
  - type: service
    id: Snowflake
related:
  - id: adr-014-use-snowflake-for-analytics-exports
badges:
  - content: Analytics
    backgroundColor: blue
    textColor: blue
---

## Context

Business reporting needs stable daily metrics more than real-time event streams. Streaming every order change adds complexity to analytics pipelines.

## Decision

OrderAnalytics publishes `OrderMetricsCalculated` once per reporting day. Operational systems remain event driven, while analytical consumers use the daily data product.

## Consequences

Reports are consistent and easier to reconcile. Real-time operations still use domain events and fulfillment read models.
