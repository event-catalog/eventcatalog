---
id: adr-010-use-risk-score-events-for-fraud
name: "ADR-010: Publish risk score events from fraud detection"
summary: FraudDetectionService publishes risk score events that payment and operations systems can consume asynchronously.
version: 1.0.0
status: accepted
date: 2024-08-14
owners:
  - full-stack
decisionMakers:
  - full-stack
appliesTo:
  - type: service
    id: FraudDetectionService
  - type: event
    id: RiskScoreCalculated
  - type: event
    id: FraudDetected
  - type: agent
    id: FraudReviewAgent
related:
  - id: adr-009-reject-synchronous-fraud-scoring
badges:
  - content: Fraud
    backgroundColor: purple
    textColor: purple
---

## Context

Fraud outcomes are needed by payment operations, fulfillment, and support tooling. Each consumer needs different thresholds and response behavior.

## Decision

FraudDetectionService publishes `RiskScoreCalculated` and `FraudDetected` events. Consumers decide whether to pause fulfillment, request manual review, or continue.

## Consequences

Fraud rules can evolve independently from checkout. Consumers must document the thresholds they apply to each risk score band.
