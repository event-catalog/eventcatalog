---
id: adr-021-deprecate-direct-inventory-adjustments
name: "ADR-021: Deprecate direct inventory adjustments from order flows"
summary: Order workflows should reserve and release inventory instead of issuing direct stock adjustment commands.
version: 1.0.0
status: deprecated
date: 2025-03-27
owners:
  - order-management
decisionMakers:
  - order-management
appliesTo:
  - type: command
    id: UpdateInventory
  - type: command
    id: AddInventory
  - type: event
    id: InventoryAdjusted
  - type: service
    id: InventoryService
related:
  - id: adr-004-reserve-inventory-before-payment
badges:
  - content: Inventory
    backgroundColor: gray
    textColor: gray
---

## Context

Early integrations adjusted stock directly from order and warehouse workflows. This made it hard to explain whether stock changed because of reservation, correction, or restock.

## Decision

Direct adjustment commands are deprecated for order-facing workflows. New order flows should use reservation and release semantics.

## Consequences

Inventory audit trails become clearer. Existing direct adjustment integrations need migration plans before the commands can be removed.
