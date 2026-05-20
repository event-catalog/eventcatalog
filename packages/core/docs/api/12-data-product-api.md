---
sidebar_position: 12
sidebar_label: Data Product API
title: Data Product frontmatter API
description: Understanding the API for data products
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.8.0" />

:::warning Beta Feature

Data Products are currently in **beta** and accepting feedback. The frontmatter API and supported fields may change based on community input.

:::

## Overview

[Data products](/docs/development/guides/data-products/introduction) are markdown files with Content, MDX components and [front-matter](https://jekyllrb.com/docs/front-matter/).

Here is an example of a basic data product.

```md title="/data-products/PaymentAnalytics/index.mdx (example)"
---
# Unique identifier for your data product
id: payment-analytics

# Display name rendered in EventCatalog
name: Payment Analytics

# Version of the data product
version: 1.0.0

# Brief summary of what this data product provides
summary: Payment performance metrics and fraud detection insights

# Optional owners (references teams or users)
owners:
  - analytics-team

# Optional badges for categorization
badges:
  - content: Analytics
    backgroundColor: purple
    textColor: purple

# Input dependencies (events, services, data stores)
inputs:
  - id: PaymentProcessed
  - id: FraudCheckCompleted
  - id: PaymentService

# Output data products (events, services, data stores with optional contracts)
outputs:
  - id: payment-analytics-db
    contract:
      path: payment-metrics-contract.json
      name: Payment Metrics Contract
      type: json-schema
---

## Overview

The Payment Analytics data product transforms payment events into actionable insights.

<NodeGraph />
```

## Required fields

### `id`

- Type: `string`

Unique id of the data product. EventCatalog uses this for references and slugs.

```mdx title="Example"
---
  id: payment-analytics
---
```

### `name`

- Type: `string`

Name of the data product used to display on the UI.

```mdx title="Example"
---
  name: Payment Analytics
---
```

### `version`

- Type: `string`

Version of the data product.

```mdx title="Example"
---
  version: 1.0.0
---
```

## Optional fields

### `summary`

Short summary of your data product, shown on summary pages.

```mdx title="Example"
---
  summary: |
    Comprehensive payment performance metrics including success rates,
    failure analysis, and fraud detection insights.
---
```

### `inputs`

- Type: `array`

Array of input dependencies that feed the data product. Inputs can be events, commands, queries, services, data stores, or channels.

```mdx title="Example"
---
inputs:
  - id: PaymentProcessed
  - id: OrderConfirmed
  - id: PaymentService
  - id: payments-db
---
```

Each input can optionally specify a version:

```mdx title="Example with versions"
---
inputs:
  - id: PaymentProcessed
    version: 2.1.0
  - id: OrderConfirmed
    version: latest  # Default if not specified
---
```

### `outputs`

- Type: `array`

Array of outputs produced by the data product. Outputs can be events, commands, queries, services, or data stores.

```mdx title="Example"
---
outputs:
  - id: OrderMetricsCalculated
  - id: NotificationService
  - id: orders-analytics-db
---
```

Outputs can include contracts to define schema specifications:

```mdx title="Example with contracts"
---
outputs:
  - id: payment-analytics-db
    contract:
      path: payment-metrics-contract.json
      name: Payment Metrics Contract
      type: json-schema
  - id: daily-sales-db
    contract:
      path: daily-sales-odcs.yaml
      name: Daily Sales ODCS
      type: odcs
---
```

Contract properties:

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `path` | `string` | Yes | File path relative to data product directory |
| `name` | `string` | Yes | Display name for the contract |
| `type` | `string` | Yes | Contract format: `json-schema` or `odcs` |

### `owners`

- Type: `array`

Array of owners for the data product. Owners reference teams or users defined in your catalog.

```mdx title="Example"
---
owners:
  - analytics-team
  - dboyne
---
```

### `badges`

<AddedIn version="3.39.4" />

- Type: `array`

Array of badges to display on the data product page.

```mdx title="Example"
---
badges:
  - content: Analytics
    backgroundColor: purple
    textColor: purple
  - content: dbt
    backgroundColor: orange
    textColor: orange
---
```

Badge properties:

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `content` | `string` | Yes | Text content of the badge |
| `backgroundColor` | `string` | Yes | Background color (named token or CSS value) |
| `textColor` | `string` | Yes | Text color (named token or CSS value) |
| `url` | `string` | No | When set, the badge renders as a clickable link with an external-link icon |

#### Use named colors

Set `backgroundColor` or `textColor` to a named palette token for automatic light/dark mode adaptation.

Supported names: `slate`, `gray`, `zinc`, `neutral`, `stone`, `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`.

#### Use any CSS color

You can also pass any valid CSS color value directly: hex (`#ff0000`), `rgb()`, `hsl()`, `oklch()`, or a CSS variable (`var(--my-color)`).

#### Link to external URLs

<AddedIn version="3.39.6" />

Add a `url` to a badge to make it render as a clickable link with an external-link icon. When `url` is omitted, the badge renders as a plain label.

```md title="Link badge example"
---
badges:
  - content: View Runbook
    url: https://runbooks.example.com/my-data-product
    backgroundColor: blue
    textColor: white
---
```

### `repository`

- Type: `object`

Repository information for the data product.

```mdx title="Example"
---
repository:
  language: Python
  url: https://github.com/example/payment-analytics
---
```

Properties:

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `language` | `string` | No | Programming language |
| `url` | `string` | No | Repository URL |

### `schemaPath`

- Type: `string`

Path to the main schema file for the data product.

```mdx title="Example"
---
schemaPath: ./payment-schema.json
---
```

### `sidebar`

- Type: `object`

Customize sidebar appearance for the data product.

```mdx title="Example"
---
sidebar:
  label: Payment Analytics
  badge: New
  color: "#4F46E5"
  backgroundColor: "#EEF2FF"
---
```

### `specifications`

- Type: `array`

Array of specification files for the data product (OpenAPI, AsyncAPI, GraphQL).

```mdx title="Example"
---
specifications:
  - type: openapi
    path: ./api-spec.yaml
    name: Payment Analytics API
---
```

### `hidden`

- Type: `boolean`

Hide the data product from the catalog UI.

```mdx title="Example"
---
hidden: true
---
```

### `editUrl`

- Type: `string`

Custom edit URL for the data product documentation.

```mdx title="Example"
---
editUrl: https://github.com/example/docs/edit/main/data-products/PaymentAnalytics/index.mdx
---
```

### `resourceGroups`

- Type: `array`

Define groups of related resources to display on the data product page.

```mdx title="Example"
---
resourceGroups:
  - id: input-events
    title: Input Events
    items:
      - id: PaymentProcessed
        type: event
      - id: FraudCheckCompleted
        type: event
    limit: 10
    sidebar: true
---
```

### `styles`

- Type: `object`

Custom styling for the data product.

```mdx title="Example"
---
styles:
  icon: DatabaseIcon
  node:
    color: "#4F46E5"
    label: Payment Analytics
---
```

### `deprecated`

- Type: `boolean | object`

Mark the data product as deprecated.

```mdx title="Example (boolean)"
---
deprecated: true
---
```

```mdx title="Example (object)"
---
deprecated:
  message: Migrate to PaymentAnalyticsV2
  date: 2026-06-01
---
```

### `visualiser`

- Type: `boolean`

Enable or disable the visualizer for the data product. Defaults to `true`.

```mdx title="Example"
---
visualiser: false
---
```

### `attachments`

- Type: `array`

Array of attachments for the data product.

```mdx title="Example"
---
attachments:
  - url: https://example.com/pipeline-diagram.png
    title: Pipeline Architecture
    description: Data flow diagram for Payment Analytics
    type: architecture-diagram
    icon: FileTextIcon
---
```

Attachments can be URLs (strings) or objects with additional properties.

Object properties:

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `url` | `string` | Yes | URL of the attachment |
| `title` | `string` | No | Title of the attachment |
| `description` | `string` | No | Description |
| `type` | `string` | No | Type for grouping attachments |
| `icon` | `string` | No | Icon from [lucide icons](https://lucide.dev/icons/) |

