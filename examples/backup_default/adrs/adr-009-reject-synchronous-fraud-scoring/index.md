---
id: adr-009-reject-synchronous-fraud-scoring
name: "ADR-009: Reject synchronous fraud scoring during checkout"
summary: Fraud scoring will not block the checkout request path unless a payment method or policy explicitly requires it.
version: 1.0.0
status: rejected
date: 2024-08-03
owners:
  - full-stack
decisionMakers:
  - full-stack
appliesTo:
  - type: service
    id: FraudDetectionService
  - type: flow
    id: PaymentProcessed
  - type: event
    id: RiskScoreCalculated
related:
  - id: adr-010-use-risk-score-events-for-fraud
badges:
  - content: Fraud
    backgroundColor: red
    textColor: red
---

## Context

Fraud checks improve chargeback outcomes, but putting every checkout through synchronous scoring would add latency and reduce checkout availability.

## Decision

We rejected synchronous fraud scoring as the default checkout path.

## Consequences

Fraud detection remains event driven and can still pause fulfillment for high-risk orders. A small set of payment methods may still require synchronous provider checks.
