---
id: adr-003-standardize-domain-event-buses
name: "ADR-003: Use a shared commerce event bus"
summary: The first messaging design used a shared bus for most commerce events.
version: 0.1.0
status: superseded
date: 2023-10-20
owners:
  - full-stack
decisionMakers:
  - full-stack
appliesTo:
  - type: domain
    id: E-Commerce
  - type: channel
    id: cross-account-bus
supersededBy:
  - id: adr-003-standardize-domain-event-buses
    version: 1.0.0
badges:
  - content: Messaging
    backgroundColor: gray
    textColor: gray
---

## Context

Early services published most commerce events to a shared bus because it was the fastest route to integrate teams.

## Decision

Use a shared commerce event bus for cross-domain event publication.

## Consequences

The shared bus became difficult to govern as domains grew. The decision has been superseded by domain-owned event buses.
