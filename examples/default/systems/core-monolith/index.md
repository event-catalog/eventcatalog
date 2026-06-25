---
id: core-monolith
name: Core Monolith
version: 1.0.0
summary: The legacy core monolith that FlowMart is gradually decomposing into fine-grained services. A system groups the services that make up this larger transitional codebase, independently of which domains those services belong to.
owners:
  - dboyne
---

## Overview

The **Core Monolith** is FlowMart's original application. As part of our
migration to microservices, the services that we carve out of the monolith are
grouped under this system so the team can see, at a glance, which parts of the
catalog still belong to the monolith during the transition.

Systems are **orthogonal to domains** — a single system can contain services
from multiple domains, and a domain can span multiple systems.

## Migration status

We are incrementally extracting bounded contexts out of the monolith. Each
extracted service keeps its domain membership while remaining part of this
system until the migration completes.
