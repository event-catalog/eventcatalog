---
id: adr-005-isolate-stripe-behind-payment-gateway
name: "ADR-005: Call Stripe directly from payment orchestration"
summary: The first payment design allowed PaymentService to call Stripe directly during capture.
version: 1.0.0
status: superseded
date: 2023-12-05
owners:
  - full-stack
decisionMakers:
  - full-stack
appliesTo:
  - type: service
    id: PaymentService
  - type: service
    id: Stripe
supersededBy:
  - id: adr-005-isolate-stripe-behind-payment-gateway
    version: 2.0.0
badges:
  - content: Integration
    backgroundColor: gray
    textColor: gray
---

## Context

The initial checkout implementation optimized for speed and used Stripe directly from the payment orchestration code.

## Decision

PaymentService called Stripe directly for authorization and capture.

## Consequences

Provider details leaked into orchestration. This made testing, provider replacement, and gateway-specific retries harder, so the decision was superseded.
