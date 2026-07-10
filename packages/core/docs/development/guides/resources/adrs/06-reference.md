---
keywords:
- EventCatalog ADRs
- Architecture decision records
- ADR frontmatter
sidebar_label: Reference
title: Architecture decision records reference
description: Frontmatter fields, paths, and routes for architecture decision records in EventCatalog.
---

This page lists the fields, paths, and routes supported by architecture decision records.

## Paths

ADRs can be created in any `adrs` folder:

```txt
/adrs/{ADR Name}/index.mdx
/domains/{Domain Name}/adrs/{ADR Name}/index.mdx
/systems/{System Name}/adrs/{ADR Name}/index.mdx
```

Versioned ADRs use:

```txt
/adrs/{ADR Name}/versioned/{version}/index.mdx
```

## Routes

| Route | Description |
|-------|-------------|
| `/docs/adrs/{adr-id}/{version}` | ADR documentation page. |

## Required fields

### `id` {#id}

- Type: `string`

Unique id of the decision record. EventCatalog uses this for URLs and resource references.

```md title="Example"
---
id: adr-001-use-event-driven-checkout
---
```

### `name` {#name}

- Type: `string`

Display name of the decision record.

```md title="Example"
---
name: Use event-driven checkout
---
```

### `version` {#version}

- Type: `string`

Version of the decision record.

```md title="Example"
---
version: 1.0.0
---
```

## Optional fields

### `status` {#status}

- Type: `proposed`, `accepted`, `rejected`, `deprecated`, or `superseded`

Lifecycle status for the decision.

```md title="Example"
---
status: accepted
---
```

### `date` {#date}

- Type: `date`

Date the decision was created or recorded.

```md title="Example"
---
date: 2026-06-01
---
```

### `summary` {#summary}

- Type: `string`

Short summary shown in lists and search.

```md title="Example"
---
summary: Checkout will publish domain events for downstream fulfilment.
---
```

### `owners` {#owners}

- Type: `array`

Teams or users that own the decision record.

```md title="Example"
---
owners:
  - architecture-team
---
```

### `decisionMakers` {#decisionMakers}

- Type: `array`

Teams or users that made or approved the decision.

```md title="Example"
---
decisionMakers:
  - architecture-review-board
---
```

### `appliesTo` {#appliesTo}

- Type: `array`

Resources affected by this decision.

```md title="Example"
---
appliesTo:
  - type: system
    id: checkout-system
---
```

### `supersedes` {#supersedes}

- Type: `array`

Decision records replaced by this decision.

```md title="Example"
---
supersedes:
  - id: adr-000-old-checkout-design
---
```

### `supersededBy` {#supersededBy}

- Type: `array`

Decision records that replace this decision.

```md title="Example"
---
supersededBy:
  - id: adr-004-new-checkout-design
---
```

### `amends` {#amends}

- Type: `array`

Decision records amended by this decision.

```md title="Example"
---
amends:
  - id: adr-002-payment-routing
---
```

### `amendedBy` {#amendedBy}

- Type: `array`

Decision records that amend this decision.

```md title="Example"
---
amendedBy:
  - id: adr-005-payment-retry-policy
---
```

### `related` {#related}

- Type: `array`

Related decision records.

```md title="Example"
---
related:
  - id: adr-003-order-events
---
```

### `badges` {#badges}

- Type: `array`

Badges rendered on the decision record page.

```md title="Example"
---
badges:
  - content: Accepted
    backgroundColor: green
    textColor: green
---
```

## Applies to

Use `appliesTo` to link the decision to resources.

```md
---
appliesTo:
  - type: system
    id: checkout-system
  - type: service
    id: payment-service
  - type: event
    id: PaymentAuthorized
---
```

Supported resource types include `agent`, `service`, `system`, `event`, `command`, `query`, `flow`, `channel`, `domain`, `user`, `team`, `container`, `entity`, `diagram`, and `data-product`.
