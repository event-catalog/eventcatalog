---
sidebar_position: 4
keywords:
- EventCatalog ADR
- supersedes
- amends
sidebar_label: Model ADR relationships
title: Model ADR relationships
description: Model how decisions supersede, amend, or relate to each other.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.42.0" />

ADRs often build on or replace earlier decisions. EventCatalog supports four relationship types to capture this history.

## Supersedes and supersededBy

Use `supersedes` when a new decision replaces an older one. The older decision should set its `status` to `superseded`.

```yaml title="adrs/adr-003-v2/index.mdx (new decision)"
---
id: adr-003-standardize-domain-event-buses
version: 2.0.0
status: accepted
supersedes:
  - id: adr-003-standardize-domain-event-buses
    version: 1.0.0
---
```

You can also declare the relationship from the older side using `supersededBy`.

```yaml title="adrs/adr-003-v1/index.mdx (old decision)"
---
id: adr-003-standardize-domain-event-buses
version: 1.0.0
status: superseded
supersededBy:
  - id: adr-003-standardize-domain-event-buses
    version: 2.0.0
---
```

EventCatalog derives reverse links automatically. Declaring `supersedes` on the new decision is enough to infer the `supersededBy` relationship on the old one, and vice versa.

## Amends and amendedBy

Use `amends` when a decision refines or extends an earlier one without fully replacing it.

```yaml
amends:
  - id: adr-001-choose-event-driven-orders
```

As with supersedes, reverse links are derived automatically from either side.

## Related

Use `related` to point to decisions that are relevant context but not in a supersedes or amends relationship.

```yaml
related:
  - id: adr-001-choose-event-driven-orders
  - id: adr-003-standardize-domain-event-buses
    version: 2.0.0
```

## How relationships appear in the sidebar

Each relationship group appears as a separate section in the ADR's sidebar:

- **Supersedes** — decisions this ADR replaces
- **Superseded by** — decisions that replace this ADR
- **Amends** — decisions this ADR refines
- **Amended by** — decisions that refine this ADR
- **Related decisions** — associated decisions

Deprecated and superseded ADRs also display a warning banner at the top of the page with links to the current decision.
