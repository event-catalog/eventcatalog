---
title: ADR-003 Use Avro Schemas for Event Serialisation
summary: Standardise on Apache Avro for event schema definitions and serialisation
---

## Status

Accepted

## Context

With multiple services producing and consuming events, we need a schema format that supports evolution without breaking consumers. JSON Schema was considered but lacks built-in support for schema evolution and compact binary encoding.

## Decision

We will use Apache Avro for all event schema definitions. Schemas will be registered in a central schema registry and events will be serialised in Avro binary format.

## Consequences

- **Positive:** Schema evolution rules (backward, forward, full compatibility) are enforced
- **Positive:** Compact binary format reduces message size and network bandwidth
- **Positive:** Schema registry provides a single source of truth for event contracts
- **Negative:** Avro tooling is less familiar to the team compared to JSON
- **Negative:** Requires a schema registry as additional infrastructure
