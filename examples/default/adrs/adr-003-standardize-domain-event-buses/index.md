---
id: adr-003-standardize-domain-event-buses
name: "ADR-003: Standardize domain event buses"
summary: Each bounded context publishes domain events to its own event bus and cross-context consumers subscribe through explicit routing.
version: 1.0.0
status: accepted
date: 2025-04-10
owners:
  - full-stack
decisionMakers:
  - full-stack
appliesTo:
  - type: domain
    id: E-Commerce
  - type: channel
    id: orders-domain-eventbus
  - type: channel
    id: payment-domain-eventbus
  - type: channel
    id: cross-account-bus
supersedes:
  - id: adr-003-standardize-domain-event-buses
    version: 0.1.0
related:
  - id: adr-001-choose-event-driven-orders
badges:
  - content: Messaging
    backgroundColor: blue
    textColor: blue
---

## Context

The catalog had a mix of service-level queues, shared buses, and provider-specific topics. Cross-domain consumers needed a predictable subscription pattern.

## Decision

Each bounded context publishes to a domain event bus. Cross-context routing is explicit and documented in channel resources.

## Consequences

Ownership of event publication is clearer. Teams must avoid using a shared bus as a hidden integration surface.
