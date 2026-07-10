---
keywords:
- EventCatalog data products
- Data product frontmatter
sidebar_label: Reference
title: Data products reference
description: Frontmatter fields, paths, and routes for data products in EventCatalog.
---

This page lists the fields, paths, and routes supported by data products.

## Paths

Data products can be created in any `data-products` folder:

```txt
/data-products/{Data Product Name}/index.mdx
/domains/{Domain Name}/data-products/{Data Product Name}/index.mdx
```

Versioned data products use:

```txt
/data-products/{Data Product Name}/versioned/{version}/index.mdx
```

## Routes

| Route | Description |
|-------|-------------|
| `/docs/data-products/{data-product-id}/{version}` | Data product documentation page. |
| `/visualiser/data-products/{data-product-id}/{version}` | Data product resource diagram. |

## Required fields

### `id` {#id}

- Type: `string`

Unique id of the data product. EventCatalog uses this for URLs and resource references.

```md title="Example"
---
id: customer-analytics
---
```

### `name` {#name}

- Type: `string`

Display name of the data product.

```md title="Example"
---
name: Customer Analytics
---
```

### `version` {#version}

- Type: `string`

Version of the data product documentation.

```md title="Example"
---
version: 1.0.0
---
```

## Optional fields

### `summary` {#summary}

- Type: `string`

Short description of the data product.

```md title="Example"
---
summary: Curated customer analytics dataset for reporting and segmentation.
---
```

### `owners` {#owners}

- Type: `array`

An array of team or user ids that own the data product.

```md title="Example"
---
owners:
  - data-platform
---
```

### `inputs` {#inputs}

- Type: `array`

Resources used as inputs to the data product.

```md title="Example"
---
inputs:
  - id: customer-database
    type: container
---
```

### `outputs` {#outputs}

- Type: `array`

Outputs produced by the data product.

```md title="Example"
---
outputs:
  - id: customer-analytics
    contract:
      path: contracts/customer-analytics.avro
      name: Customer analytics contract
      type: avro
---
```

### `badges` {#badges}

- Type: `array`

Badges rendered on the data product page.

```md title="Example"
---
badges:
  - content: Certified
    backgroundColor: green
    textColor: green
---
```

### `repository` {#repository}

- Type: `object`

Repository metadata for the data product.

```md title="Example"
---
repository:
  language: SQL
  url: https://github.com/acme/customer-analytics
---
```

### `diagrams` {#diagrams}

- Type: `array`

Diagrams associated with the data product.

```md title="Example"
---
diagrams:
  - id: customer-analytics-lineage
    version: 1.0.0
---
```

### `attachments` {#attachments}

- Type: `array`

External links or supporting documents attached to the data product.

```md title="Example"
---
attachments:
  - title: Data contract review
    url: https://docs.example.com/customer-analytics
    type: document
---
```

## Output contracts

Outputs can include a contract that describes the data product output.

```md
---
outputs:
  - id: customer-analytics
    contract:
      path: contracts/customer-analytics.avro
      name: Customer analytics contract
      type: avro
---
```
