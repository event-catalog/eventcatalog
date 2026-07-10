---
keywords:
- EventCatalog flows
- Flow frontmatter
sidebar_position: 6
sidebar_label: Reference
title: Flows reference
description: Frontmatter fields, paths, and routes for flows in EventCatalog.
---

This page lists the fields, paths, and routes supported by flows.

## Paths

Flows can be created in any `flows` folder:

```txt
/flows/{Flow Name}/index.mdx
/domains/{Domain Name}/flows/{Flow Name}/index.mdx
/services/{Service Name}/flows/{Flow Name}/index.mdx
```

Versioned flows use:

```txt
/flows/{Flow Name}/versioned/{version}/index.mdx
```

## Routes

| Route | Description |
|-------|-------------|
| `/docs/flows/{flow-id}/{version}` | Flow documentation page. |
| `/visualiser/flows/{flow-id}/{version}` | Flow diagram. |

## Required fields

### `id` {#id}

- Type: `string`

Unique id of the flow. EventCatalog uses this for URLs and resource references.

```md title="Example"
---
id: checkout-flow
---
```

### `name` {#name}

- Type: `string`

Display name of the flow.

```md title="Example"
---
name: Checkout Flow
---
```

### `version` {#version}

- Type: `string`

Version of the flow documentation.

```md title="Example"
---
version: 1.0.0
---
```

## Optional fields

### `summary` {#summary}

- Type: `string`

Short description of the flow.

```md title="Example"
---
summary: Describes the steps from checkout start to order confirmation.
---
```

### `owners` {#owners}

- Type: `array`

An array of team or user ids that own the flow.

```md title="Example"
---
owners:
  - checkout-platform
---
```

### `steps` {#steps}

- Type: `array`

Ordered steps in the flow.

```md title="Example"
---
steps:
  - id: submit-order
    title: Submit order
    message:
      id: SubmitOrder
    next_step: authorize-payment
---
```

### `badges` {#badges}

- Type: `array`

Badges rendered on the flow page.

```md title="Example"
---
badges:
  - content: Critical path
    backgroundColor: red
    textColor: red
---
```

### `repository` {#repository}

- Type: `object`

Repository metadata for the flow.

```md title="Example"
---
repository:
  language: TypeScript
  url: https://github.com/acme/checkout
---
```

### `diagrams` {#diagrams}

- Type: `array`

Diagrams associated with the flow.

```md title="Example"
---
diagrams:
  - id: checkout-sequence
    version: 1.0.0
---
```

### `attachments` {#attachments}

- Type: `array`

External links or supporting documents attached to the flow.

```md title="Example"
---
attachments:
  - title: Checkout runbook
    url: https://runbooks.example.com/checkout
    type: runbook
---
```

## Step fields

Each flow step supports:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` or `number` | Unique step id. |
| `title` | `string` | Step title. |
| `summary` | `string` | Optional step summary. |
| `message` | `object` | Message referenced by this step. |
| `agent` | `object` | Agent referenced by this step. |
| `service` | `object` | Service referenced by this step. |
| `flow` | `object` | Nested flow referenced by this step. |
| `container` | `object` | Data store referenced by this step. |
| `dataProduct` | `object` | Data product referenced by this step. |
| `actor` | `object` | Inline actor for this step. |
| `custom` | `object` | Custom node for this step. |
| `externalSystem` | `object` | External system for this step. |
| `next_step` | `string` or `number` | Next step id. |
| `next_steps` | `array` | Multiple next step ids. |

## External services nodes {#external-services-nodes}

Use `externalSystem` when a flow step points at a third-party system.

```md
---
steps:
  - id: payment-provider
    title: Payment provider
    externalSystem:
      name: Stripe
      summary: External payment processor.
    next_step: complete
---
```

## Actor nodes {#actor-nodes}

Use `actor` when a flow step represents a person, role, or external participant.

```md
---
steps:
  - id: customer
    title: Customer starts checkout
    actor:
      name: Customer
    next_step: submit-order
---
```
