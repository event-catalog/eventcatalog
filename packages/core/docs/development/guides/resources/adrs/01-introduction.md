---
sidebar_position: 1
keywords:
- EventCatalog ADR
- architecture decision records
- ADR documentation
sidebar_label: What are ADRs?
title: What are architecture decision records?
description: Document and govern architectural choices alongside your catalog resources.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

[Architecture decision records (ADRs)](https://adr.github.io/) capture why your team made a particular design choice. In EventCatalog, ADRs are first-class resources that live alongside services, events, domains, and flows.

Architectural choices are often made once and then forgotten. When a new engineer joins or a design is revisited months later, the reasoning behind past decisions is usually lost.

Documenting ADRs in your catalog gives your team:

- **Context** — anyone can see what alternatives were considered and why a particular path was chosen.
- **Traceability** — decisions are linked directly to the services, events, domains, and flows they affect via `appliesTo`.
- **Lifecycle tracking** — each ADR has a status (`proposed`, `accepted`, `rejected`, `deprecated`, `superseded`) so it is clear which decisions are still in force.
- **AI-ready context** — because ADRs sit alongside the resources they govern, the [EventCatalog MCP server](/docs/development/ask-your-architecture/mcp-server/introduction) can surface the *why* behind your architecture to AI assistants, not just the *what*. When an LLM is reasoning about a service or event, it picks up the decisions, trade-offs, and constraints recorded in your ADRs.

## Lifecycle statuses

Every ADR must declare a `status` field. The available values are:

| Status | Meaning |
| --- | --- |
| `proposed` | Under discussion, not yet accepted |
| `accepted` | In force |
| `rejected` | Considered and deliberately not adopted |
| `deprecated` | Was accepted but is being phased out |
| `superseded` | Replaced by a newer decision |

EventCatalog renders a colored badge for each status and shows a warning banner on `deprecated` and `superseded` pages so readers are directed to the current decision.
