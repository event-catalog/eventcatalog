---
id: adr-018-subscription-payment-failure-recovery-window
name: "ADR-018: Use a recovery window for subscription payment failures"
summary: Failed subscription payments enter a recovery window before cancellation so retry and customer update flows can complete.
version: 1.0.0
status: accepted
date: 2025-05-05
owners:
  - subscriptions-management
decisionMakers:
  - subscriptions-management
appliesTo:
  - type: flow
    id: SubscriptionPaymentFailure
  - type: agent
    id: SubscriptionRecoveryAgent
  - type: event
    id: SubscriptionPaymentDue
  - type: event
    id: UserSubscriptionCancelled
related:
  - id: adr-017-keep-subscription-cancellation-command-based
badges:
  - content: Subscriptions
    backgroundColor: amber
    textColor: amber
---

## Context

Immediate cancellation after a failed renewal creates avoidable churn. Customers often update payment details after reminders.

## Decision

Subscription payment failures enter a recovery window. SubscriptionRecoveryAgent can recommend outreach and retry timing, while cancellation remains a command.

## Consequences

Customer retention improves and cancellation remains auditable. The recovery window must be visible in support and billing metrics.
