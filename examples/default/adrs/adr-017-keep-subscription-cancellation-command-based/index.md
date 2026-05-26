---
id: adr-017-keep-subscription-cancellation-command-based
name: "ADR-017: Keep subscription cancellation command based"
summary: Subscription cancellation remains an explicit command so policy checks and customer intent are captured before state changes.
version: 1.0.0
status: accepted
date: 2025-04-21
owners:
  - subscriptions-management
decisionMakers:
  - subscriptions-management
appliesTo:
  - type: domain
    id: Subscriptions
  - type: flow
    id: CancelSubscription
  - type: command
    id: CancelSubscription
  - type: event
    id: UserSubscriptionCancelled
badges:
  - content: Subscriptions
    backgroundColor: green
    textColor: green
---

## Context

Subscription cancellation can be customer initiated, payment driven, support initiated, or policy driven. Each reason has different eligibility and notification requirements.

## Decision

Cancellation remains an explicit command handled by SubscriptionService. Events describe the outcome after policy checks complete.

## Consequences

Cancellation workflows stay auditable and policy aware. Event consumers should not infer intent from the cancellation event alone.
