---
id: adr-019-use-agents-for-order-support
name: "ADR-019: Use agents for order support triage"
summary: OrderSupportAgent can summarize order state and recommend next actions, but it must not mutate orders directly.
version: 1.0.0
status: proposed
date: 2025-02-24
owners:
  - order-management
decisionMakers:
  - order-management
appliesTo:
  - type: agent
    id: OrderSupportAgent
  - type: query
    id: GetOrder
  - type: service
    id: OrdersService
  - type: event
    id: OrderAmended
badges:
  - content: AI
    backgroundColor: purple
    textColor: purple
---

## Context

Support teams need faster context gathering across order, payment, inventory, and shipment systems. An agent can summarize state but direct mutation would create unclear accountability.

## Decision

OrderSupportAgent may read cataloged query contracts and summarize likely next actions. It cannot place, amend, cancel, or refund orders.

## Consequences

Support workflows can be faster while preserving human approval for changes. Future ADRs must define audit requirements before allowing any write action.
