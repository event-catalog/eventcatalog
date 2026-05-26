---
id: adr-005-isolate-stripe-behind-payment-gateway
name: "ADR-005: Isolate Stripe behind PaymentGatewayService"
summary: Stripe integration details are contained behind PaymentGatewayService so payment orchestration is not coupled to a provider API.
version: 2.0.0
status: accepted
date: 2024-07-11
owners:
  - full-stack
decisionMakers:
  - full-stack
appliesTo:
  - type: service
    id: PaymentGatewayService
  - type: service
    id: Stripe
  - type: command
    id: ChargeCard
  - type: event
    id: StripeChargeSucceeded
supersedes:
  - id: adr-005-isolate-stripe-behind-payment-gateway
    version: 1.0.0
related:
  - id: adr-006-centralize-payment-status-read-model
badges:
  - content: Integration
    backgroundColor: blue
    textColor: blue
---

## Context

Payment orchestration needs to support retries, provider failover, and future payment methods without leaking provider-specific fields through the catalog.

## Decision

Stripe commands and events remain inside the PaymentGatewayService boundary. PaymentService talks to the gateway through provider-neutral contracts.

## Consequences

Provider changes are localized to PaymentGatewayService. The gateway must maintain a mapping between provider identifiers and internal payment references.
