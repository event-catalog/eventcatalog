---
id: adr-022-strangle-the-core-monolith
name: "ADR-022: Strangle the core monolith"
summary: Carve services out of the core monolith incrementally using the strangler-fig pattern rather than attempting a single big-bang rewrite.
version: 1.0.0
status: accepted
date: 2026-02-18
owners:
  - dboyne
decisionMakers:
  - dboyne
appliesTo:
  - type: system
    id: core-monolith
related:
  - id: adr-001-choose-event-driven-orders
badges:
  - content: Architecture
    backgroundColor: blue
    textColor: blue
---

## Context

The Core Monolith still owns several services that span multiple domains. A
big-bang rewrite would be high risk and would freeze feature delivery for too
long.

## Decision

We apply the strangler-fig pattern: new capability is built as standalone
services, and existing capability is migrated out of the monolith one service at
a time. The `core-monolith` system tracks which services still belong to the
monolith during the transition.

## Consequences

Migration progress is visible at a glance through the system. Teams must keep
the system's service list up to date as services are carved out, so the system
shrinks toward empty as the migration completes.
