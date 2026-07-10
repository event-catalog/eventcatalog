---
sidebar_position: 8
keywords:
- EventCatalog services
- Service frontmatter
sidebar_label: Reference
title: Services reference
description: Frontmatter fields, paths, and routes for services in EventCatalog.
---

This page lists the fields, paths, and routes supported by services.

## Paths

Services can be created at the root of your catalog:

```txt
/services/{Service Name}/index.mdx
```

Services can also be created inside domains or systems:

```txt
/domains/{Domain Name}/services/{Service Name}/index.mdx
/systems/{System Name}/services/{Service Name}/index.mdx
/domains/{Domain Name}/systems/{System Name}/services/{Service Name}/index.mdx
```

Versioned services use:

```txt
/services/{Service Name}/versioned/{version}/index.mdx
```

## Routes

| Route | Description |
|-------|-------------|
| `/docs/services/{service-id}/{version}` | Service documentation page. |
| `/visualiser/services/{service-id}/{version}` | Service resource diagram. |

## Required fields

### `id` {#id}

- Type: `string`

Unique id of the service. EventCatalog uses this for URLs and resource references.

```md title="Example"
---
id: payment-service
---
```

### `name` {#name}

- Type: `string`

Display name of the service.

```md title="Example"
---
name: Payment Service
---
```

### `version` {#version}

- Type: `string`

Version of the service documentation.

```md title="Example"
---
version: 1.0.0
---
```

## Optional fields

### `summary` {#summary}

- Type: `string`

Short summary of what the service does.

```md title="Example"
---
summary: Authorizes payments and emits payment lifecycle events.
---
```

### `owners` {#owners}

- Type: `array`

An array of team or user ids that own the service.

```md title="Example"
---
owners:
  - payments-platform
---
```

### `sends` {#sends}

- Type: `array`

Messages the service sends or publishes.

```md title="Example"
---
sends:
  - id: PaymentAuthorized
    version: 1.0.0
---
```

### `receives` {#receives}

- Type: `array`

Messages the service receives or consumes.

```md title="Example"
---
receives:
  - id: AuthorizePayment
    version: 1.0.0
---
```

### `entities` {#entities}

- Type: `array`

Entities associated with the service.

```md title="Example"
---
entities:
  - id: payment
    version: 1.0.0
---
```

### `writesTo` {#writesTo}

- Type: `array`

Data stores the service writes to.

```md title="Example"
---
writesTo:
  - id: payments-database
    version: 1.0.0
---
```

### `readsFrom` {#readsFrom}

- Type: `array`

Data stores the service reads from.

```md title="Example"
---
readsFrom:
  - id: customer-database
    version: 1.0.0
---
```

### `flows` {#flows}

- Type: `array`

Flows associated with the service.

```md title="Example"
---
flows:
  - id: payment-authorization
    version: 1.0.0
---
```

### `externalSystem` {#externalSystem}

- Type: `boolean`

Marks the service as an external service or integration.

```md title="Example"
---
externalSystem: true
---
```

### `specifications` {#specifications}

- Type: `object` or `array`

OpenAPI, AsyncAPI, or GraphQL specifications for the service.

```md title="Example"
---
specifications:
  - type: openapi
    path: openapi.yml
    name: Public API
  - type: asyncapi
    path: asyncapi.yml
---
```

### `badges` {#badges}

- Type: `array`

Badges rendered on the service page.

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

Repository metadata for the service.

```md title="Example"
---
repository:
  language: TypeScript
  url: https://github.com/acme/payment-service
---
```

### `diagrams` {#diagrams}

- Type: `array`

Diagrams associated with the service.

```md title="Example"
---
diagrams:
  - id: payment-service-sequence
    version: 1.0.0
---
```

### `attachments` {#attachments}

- Type: `array`

External links or supporting documents attached to the service.

```md title="Example"
---
attachments:
  - url: https://runbooks.example.com/payment-service
    title: Payment Service runbook
    type: runbook
---
```

## Resource pointers

Services reference related resources using `id` and optional `version`.

```md
---
sends:
  - id: OrderCreated
receives:
  - id: CreateOrder
writesTo:
  - id: orders-database
flows:
  - id: checkout-flow
---
```

If `version` is omitted, EventCatalog uses the latest version.
