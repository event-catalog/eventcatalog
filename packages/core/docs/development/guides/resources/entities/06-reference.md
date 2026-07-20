---
keywords:
- EventCatalog entities
- Entity frontmatter
sidebar_position: 6
sidebar_label: Reference
title: Entities reference
description: Frontmatter fields, paths, and routes for entities in EventCatalog.
---

This page lists the fields, paths, and routes supported by entities.

## Paths

Entities can be created at the root of your catalog:

```txt
/entities/{Entity Name}/index.mdx
```

Entities can also be created inside domains, systems, or services:

```txt
/domains/{Domain Name}/entities/{Entity Name}/index.mdx
/systems/{System Name}/entities/{Entity Name}/index.mdx
/domains/{Domain Name}/systems/{System Name}/entities/{Entity Name}/index.mdx
/services/{Service Name}/entities/{Entity Name}/index.mdx
```

Versioned entities use:

```txt
/entities/{Entity Name}/versioned/{version}/index.mdx
```

Nested entities use the same `versioned/{version}/index.mdx` pattern inside their entity folder.

## Routes

| Route | Description |
|-------|-------------|
| `/docs/entities/{entity-id}/{version}` | Entity documentation page. |
| `/visualiser/entities/{entity-id}/{version}` | Entity resource diagram. |
| `/visualiser/domains/{domain-id}/{version}/entity-map` | Entity map for entities assigned to a domain. |
| `/visualiser/services/{service-id}/{version}/entity-map` | Entity map for entities assigned to a service. |

## Frontmatter example

```md
---
# Unique identifier for the entity. Used in URLs and resource references.
id: order
# Friendly display name shown in EventCatalog.
name: Order
# Version of this entity documentation.
version: 1.0.0
# Short summary shown in lists, sidebars, and previews.
summary: Represents a customer's purchase.
# The property that uniquely identifies this entity.
identifier: orderId
# Optional. Marks this entity as the aggregate root for the model.
aggregateRoot: true
# Teams or users that own this entity.
owners:
  - ordering-platform
# Properties that describe the shape of the entity.
properties:
  # Unique identifier for this order.
  - name: orderId
    # Data type for the property.
    type: string
    # Whether this property is required.
    required: true
    # Human-readable description of what the property represents.
    description: Unique order identifier.
  # Identifier for the customer that placed the order.
  - name: customerId
    # Data type for the property.
    type: string
    # Whether this property is required.
    required: true
    # Human-readable description of what the property represents.
    description: Customer that placed the order.
    # Entity this property references.
    references: customer
    # Label used to describe the relationship in entity maps.
    relationType: placedBy
    # Identifier property on the referenced entity.
    referencesIdentifier: customerId
  # Current lifecycle state of the order.
  - name: status
    # Data type for the property.
    type: string
    # Allowed values for the property.
    enum:
      - pending
      - confirmed
      - cancelled
---
```

## Required fields

### `id` {#id}

- Type: `string`

Unique id of the entity. EventCatalog uses this for URLs and resource references.

```md title="Example"
---
id: order
---
```

### `name` {#name}

- Type: `string`

Display name of the entity.

```md title="Example"
---
name: Order
---
```

### `version` {#version}

- Type: `string`

Version of the entity documentation.

```md title="Example"
---
version: 1.0.0
---
```

## Optional fields

### `summary` {#summary}

- Type: `string`

Short summary of what the entity represents.

```md title="Example"
---
summary: Represents a customer's purchase.
---
```

### `owners` {#owners}

- Type: `array`

An array of team or user ids that own the entity.

```md title="Example"
---
owners:
  - ordering-platform
---
```

### `aggregateRoot` {#aggregateRoot}

- Type: `boolean`

Marks the entity as an aggregate root.

```md title="Example"
---
aggregateRoot: true
---
```

### `identifier` {#identifier}

- Type: `string`

The property that uniquely identifies the entity.

```md title="Example"
---
identifier: orderId
---
```

### `properties` {#properties}

- Type: `array`

Properties that describe the shape of the entity.

```md title="Example"
---
properties:
  - name: orderId
    type: string
    required: true
    description: Unique order identifier.
---
```

### `badges` {#badges}

- Type: `array`

Badges rendered on the entity page.

```md title="Example"
---
badges:
  - content: Aggregate root
    backgroundColor: blue
    textColor: blue
---
```

### `repository` {#repository}

- Type: `object`

Repository metadata for the entity.

```md title="Example"
---
repository:
  language: TypeScript
  url: https://github.com/acme/orders
---
```

### `attachments` {#attachments}

- Type: `array`

External links or supporting documents attached to the entity.

```md title="Example"
---
attachments:
  - title: Order model runbook
    url: https://runbooks.example.com/orders
    type: runbook
---
```

## Property fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Property name. |
| `type` | `string` | Property type, such as `string`, `UUID`, `datetime`, or another entity name. |
| `required` | `boolean` | Whether the property is required. |
| `description` | `string` | Description of the property. |
| `references` | `string` | Entity id referenced by this property. |
| `referencesIdentifier` | `string` | Identifier property on the referenced entity. |
| `relationType` | `string` | Relationship label shown in entity maps. |
| `enum` | `array` | Allowed string values. |
| `items` | `object` | Item type for array properties. |

## EntityPropertiesTable component

Use `<EntityPropertiesTable />` in the entity Markdown body to render the entity properties as a table.

```mdx
<EntityPropertiesTable />
```

This is useful when you want the documentation page to show the same properties defined in frontmatter.

## Custom properties

You can add organization-specific metadata to this resource using frontmatter fields prefixed with `x-`. Learn how to define, render, and reference them in [Custom properties on resources](/docs/development/customization/custom-properties).
