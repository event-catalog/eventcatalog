---
sidebar_position: 6
keywords:
- EventCatalog systems
- System frontmatter
sidebar_label: Reference
title: Systems reference
description: Frontmatter fields, paths, and routes for systems in EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="4.0" />

This page lists the fields, paths, and routes supported by systems.

## Paths

Systems can be created at the root of your catalog:

```txt
/systems/{System Name}/index.mdx
```

Systems can also be created inside domains:

```txt
/domains/{Domain Name}/systems/{System Name}/index.mdx
```

Versioned systems use the same versioning pattern as other EventCatalog resources:

```txt
/systems/{System Name}/versioned/{version}/index.mdx
/domains/{Domain Name}/systems/{System Name}/versioned/{version}/index.mdx
```

## Routes

| Route | Description |
|-------|-------------|
| `/docs/systems/{system-id}/{version}` | System documentation page. |
| `/visualiser/systems/{system-id}/{version}` | Resource diagram for one system. |
| `/visualiser/systems/{system-id}/{version}/context` | Context diagram for one system. |
| `/visualiser/system-context-map` | Global system context map. |

## Required fields

### `id` {#id}

- Type: `string`

Unique id of the system. EventCatalog uses this for URLs and resource references.

```md title="Example"
---
id: checkout-system
---
```

### `name` {#name}

- Type: `string`

Display name of the system.

```md title="Example"
---
name: Checkout System
---
```

### `version` {#version}

- Type: `string`

Version of the system documentation.

```md title="Example"
---
version: 1.0.0
---
```

## Optional fields

### `summary` {#summary}

- Type: `string`

Short summary of what the system does.

```md title="Example"
---
summary: Handles checkout, payment authorization, and order submission.
---
```

### `owners` {#owners}

- Type: `array`

An array of team or user ids that own the system.

```md title="Example"
---
owners:
  - checkout-platform
---
```

### `scope` {#scope}

- Type: `internal` or `external`

Whether the system is owned by your organization or is an external system. Defaults to `internal`.

```md title="Example"
---
scope: external
---
```

### `services` {#services}

- Type: `array`

Services that belong to the system.

```md title="Example"
---
services:
  - id: checkout-api
    version: 1.0.0
---
```

### `flows` {#flows}

- Type: `array`

Flows that belong to the system.

```md title="Example"
---
flows:
  - id: checkout-flow
    version: 1.0.0
---
```

### `entities` {#entities}

- Type: `array`

Entities that belong to the system.

```md title="Example"
---
entities:
  - id: order
    version: 1.0.0
---
```

### `containers` {#containers}

- Type: `array`

Containers or data stores that belong to the system.

```md title="Example"
---
containers:
  - id: checkout-database
    version: 1.0.0
---
```

### `relationships` {#relationships}

- Type: `array`

Other systems this system relates to.

```md title="Example"
---
relationships:
  - id: promotion-system
    version: 1.0.0
    label: calculates discounts via
---
```

### `actors` {#actors}

- Type: `array`

People, roles, or external actors that interact with the system.

```md title="Example"
---
actors:
  - id: shopper
    name: Shopper
    label: adds items and checks out
    direction: inbound
---
```

### `badges` {#badges}

- Type: `array`

Badges rendered on the system page.

```md title="Example"
---
badges:
  - content: Critical
    backgroundColor: red
    textColor: red
---
```

### `repository` {#repository}

- Type: `object`

Repository metadata for the system.

```md title="Example"
---
repository:
  language: TypeScript
  url: https://github.com/acme/checkout
---
```

### `diagrams` {#diagrams}

- Type: `array`

Diagrams associated with the system.

```md title="Example"
---
diagrams:
  - id: checkout-deployment
    version: 1.0.0
---
```

### `attachments` {#attachments}

- Type: `array`

External links or supporting documents attached to the system.

```md title="Example"
---
attachments:
  - title: Checkout runbook
    url: https://runbooks.example.com/checkout
    type: runbook
---
```

## Resource pointers

Systems reference resources using `id` and optional `version`.

```md
---
services:
  - id: cart-api
    version: 1.0.0
containers:
  - id: cart-database
flows:
  - id: checkout-flow
entities:
  - id: cart
---
```

If `version` is omitted, EventCatalog uses the latest version.

## Relationship fields

Relationships connect one system to another system.

```md
---
relationships:
  - id: promotion-system
    version: 1.0.0
    label: calculates discounts via
---
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Target system id. |
| `version` | `string` | Target system version. Optional. Defaults to latest. |
| `label` | `string` | Text shown on the relationship edge. |

Relationships are one-directional. Define the relationship on the system that owns the source of the relationship.

## Actor fields

Actors are people, roles, or external participants that interact with a system.

```md
---
actors:
  - id: shopper
    name: Shopper
    label: adds items and checks out
    direction: inbound
---
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique actor id. |
| `name` | `string` | Display name shown in diagrams. Optional. |
| `label` | `string` | Text shown on the actor relationship edge. Optional. |
| `direction` | `inbound` or `outbound` | `inbound` means actor to system. `outbound` means system to actor. Defaults to `inbound`. |
