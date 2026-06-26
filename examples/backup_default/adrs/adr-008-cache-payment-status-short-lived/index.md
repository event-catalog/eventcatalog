---
id: adr-008-cache-payment-status-short-lived
name: "ADR-008: Cache payment status for short-lived reads"
summary: Payment status lookups use a short TTL cache to reduce repeated read model traffic during checkout polling.
version: 1.0.0
status: accepted
date: 2024-10-01
owners:
  - full-stack
decisionMakers:
  - full-stack
appliesTo:
  - type: service
    id: PaymentService
  - type: container
    id: payment-cache
  - type: query
    id: GetPaymentStatus
related:
  - id: adr-006-centralize-payment-status-read-model
badges:
  - content: Performance
    backgroundColor: amber
    textColor: amber
---

## Context

Checkout pages poll payment status while waiting for provider callbacks. Without caching, short polling windows create unnecessary load on the payment read model.

## Decision

PaymentService may cache `GetPaymentStatus` responses for a short TTL. Terminal states can be cached longer than pending states.

## Consequences

Polling traffic is reduced without hiding state transitions for long periods. Clients must treat status as eventually consistent during active payment processing.
