---
id: adr-006-centralize-payment-status-read-model
name: "ADR-006: Centralize payment status in a read model"
summary: Payment status queries use a read model owned by PaymentService instead of querying gateway and fraud systems directly.
version: 1.0.0
status: accepted
date: 2024-06-18
owners:
  - full-stack
decisionMakers:
  - full-stack
appliesTo:
  - type: service
    id: PaymentService
  - type: query
    id: GetPaymentStatus
  - type: event
    id: PaymentProcessed
  - type: event
    id: PaymentFailed
related:
  - id: adr-007-store-payments-in-dedicated-postgres
badges:
  - content: Read model
    backgroundColor: purple
    textColor: purple
---

## Context

Customer support and checkout screens need a consistent payment status. Reading across payment gateway, fraud, and local transaction state creates inconsistent answers during retries.

## Decision

PaymentService owns a payment status read model updated from payment, gateway, and fraud events. Clients read status through `GetPaymentStatus`.

## Consequences

Clients get a stable query contract and avoid provider-specific logic. The read model must expose freshness metadata so support teams can understand delayed updates.
