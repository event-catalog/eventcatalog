---
id: adr-020-limit-refund-agent-to-policy-advice
name: "ADR-020: Limit refund agent to policy advice"
summary: RefundPolicyAgent explains policy and recommends outcomes but does not trigger refunds or create payment adjustments.
version: 1.0.0
status: accepted
date: 2025-03-08
owners:
  - full-stack
decisionMakers:
  - full-stack
appliesTo:
  - type: agent
    id: RefundPolicyAgent
  - type: flow
    id: PaymentRefund
  - type: entity
    id: PaymentRefund
  - type: service
    id: PaymentService
related:
  - id: adr-010-use-risk-score-events-for-fraud
badges:
  - content: AI
    backgroundColor: purple
    textColor: purple
---

## Context

Refund decisions combine policy, customer history, payment state, and fraud signals. Automating the final action would require strict audit and approval controls.

## Decision

RefundPolicyAgent provides policy interpretation and recommendations only. Refund execution remains in controlled payment workflows.

## Consequences

Support users get better guidance without giving the agent payment authority. The product can add audit controls before considering automated refund actions.
