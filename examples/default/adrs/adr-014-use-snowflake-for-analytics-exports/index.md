---
id: adr-014-use-snowflake-for-analytics-exports
name: "ADR-014: Use Snowflake for analytics exports"
summary: Curated commerce data products are exported to Snowflake for analytics workloads and BI access.
version: 1.0.0
status: accepted
date: 2025-01-16
owners:
  - full-stack
decisionMakers:
  - full-stack
appliesTo:
  - type: service
    id: Snowflake
  - type: data-product
    id: OrderAnalytics
  - type: data-product
    id: PaymentAnalytics
  - type: data-product
    id: SubscriptionMetrics
related:
  - id: adr-013-publish-order-metrics-daily
badges:
  - content: Warehouse
    backgroundColor: green
    textColor: green
---

## Context

Analytics consumers need governed access to order, payment, and subscription data without reading from service databases.

## Decision

Curated data products are exported to Snowflake. Service-owned databases remain operational stores and are not queried directly by BI tooling.

## Consequences

Analytics workloads are isolated from operational systems. Data product owners must publish schemas and data quality expectations before export.
