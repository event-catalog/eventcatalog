---
sidebar_position: 4
keywords:
- EventCatalog data products
sidebar_label: Data Contracts
title: Data Contracts
description: Define schema contracts for outputs
---

import AddedIn from '@site/src/components/MDX/AddedIn';

Contracts define the schema structure for data product outputs. They provide clear expectations for downstream consumers and enable schema validation.

Your contracts can be any format you want (e.g JSON Schema, ODCS YAML, etc).

## What are contracts?

Contracts are schema specifications attached to data product outputs. They document the structure, types, and constraints of the data your product produces.

Contracts help teams:

- Understand output data structures without inspecting code
- Validate data against expected schemas
- Catch breaking changes before deployment
- Enable self-service data consumption

## Supported formats

EventCatalog supports any schema or specification format.

## Adding contracts

Contracts are defined in the `outputs` array of your data product frontmatter.

```md title="/data-products/PaymentAnalytics/index.mdx"
---
id: payment-analytics
name: Payment Analytics
version: 1.0.0

outputs:
  - id: payment-analytics-db
    contract:
      path: payment-metrics-contract.json
      name: Payment Metrics Contract
      type: json-schema
---
```

Contract properties:

- **path** is the file path relative to the data product directory
- **name** is the display name shown in EventCatalog
- **type** specifies the format (`json-schema` or `odcs`)

## Viewing contracts

EventCatalog provides a schema explorer for viewing contracts.

Use the `<SchemaViewer />` component to display contracts in your documentation:

```md
## Output Schema

<SchemaViewer file="payment-metrics-contract.json" />
```

![Example](./img/data-schema-viewer.png)

The schema explorer renders:

- Interactive field navigation
- Type information and constraints
- Field descriptions
- Required field indicators

## Multiple contracts

A single output can have multiple contracts for different tables or datasets.

```md
outputs:
  - id: analytics-warehouse
    contract:
      path: fact-orders.json
      name: Fact Orders
      type: json-schema
  - id: analytics-warehouse
    contract:
      path: dim-customers.json
      name: Customer Dimension
      type: json-schema
```


## Next steps

- [Version data products](/docs/development/guides/versioning-resources)
- [Add to domains](/docs/development/guides/domains/add-resources-to-domains/add-data-products-to-domains)
- [Schema explorer component](/docs/development/components/using-components)
