---
title: Use CQRS for Order Queries
summary: Separate read and write models for order data to optimise query performance
---

## Status

Accepted

## Context

The Orders service handles a high volume of read requests (order status, order history, order search) alongside write operations (place order, cancel order, update order). The read patterns differ significantly from the write model, and query performance was degrading under load.

## Decision

We will implement CQRS (Command Query Responsibility Segregation) for the Orders service. Write operations will go through the command model, and domain events will project data into optimised read models.

## Consequences

- **Positive:** Read and write models can be scaled independently
- **Positive:** Read models can be optimised for specific query patterns
- **Positive:** Write model stays focused on business rules and validation
- **Negative:** Increased infrastructure complexity with separate data stores
- **Negative:** Read models may lag behind writes due to eventual consistency
