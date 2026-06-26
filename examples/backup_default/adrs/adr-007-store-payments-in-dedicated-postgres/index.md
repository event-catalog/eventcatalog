---
id: adr-007-store-payments-in-dedicated-postgres
name: "ADR-007: Store payment state in a dedicated Postgres database"
summary: PaymentService owns its payment state in `payments-db` rather than sharing the order database.
version: 1.0.0
status: accepted
date: 2024-09-09
owners:
  - full-stack
decisionMakers:
  - full-stack
appliesTo:
  - type: service
    id: PaymentService
  - type: container
    id: payments-db
  - type: entity
    id: Payment
  - type: entity
    id: Transaction
related:
  - id: adr-006-centralize-payment-status-read-model
badges:
  - content: Data ownership
    backgroundColor: green
    textColor: green
---

## Context

Payment state includes provider references, authorization attempts, refund history, and operational metadata. Sharing the order database would blur ownership between domains.

## Decision

PaymentService owns `payments-db`. Other services learn about payment state through events and queries owned by PaymentService.

## Consequences

Payment data can be secured and audited separately. Cross-domain workflows rely on events and read models rather than direct joins.
