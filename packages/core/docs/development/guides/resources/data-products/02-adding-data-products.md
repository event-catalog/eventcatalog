---
sidebar_position: 2
keywords:
- EventCatalog data products
sidebar_label: Create a data product
title: Create a data product
description: Creating and managing data products
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PromptBox from '@site/src/components/MDX/PromptBox';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

<AddedIn version="3.8.0" />

Data products document analytical datasets that transform operational (e.g databases, messages, channels) data into insights. Adding a data product helps teams understand data lineage, contracts, and consumption patterns.

![Example](./img/data-product.png)

## Adding a new data product

### Automatic Creation

<PromptBox preview="Create a new EventCatalog data product">
Read https://www.eventcatalog.dev/docs/development/guides/resources/data-products/adding-data-products.md and https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/data-products.md then help me create a new EventCatalog data product in my catalog.

Ask me for the data product name, what analytical dataset it provides, summary, owners, whether it belongs at the root of the catalog or inside a domain, and any known inputs, outputs, or data contracts. Then create the correct data-products/{'{Data Product Name}'}/index.mdx or domains/{'{Domain Name}'}/data-products/{'{Data Product Name}'}/index.mdx file with frontmatter and starter markdown, you can add as much markdown as you want that captures the users input.

If the data product has output contracts, ask me for the contract file names, types, and where those contract files should live.

If the catalog does not have any domains, put it into the root data-products folder.

You can use MDX components found here https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/components.md
</PromptBox>

Copy this prompt and paste it into your coding agent. Your agent can help you choose where the data product should live, create the right folder structure, and add the first version of the data product documentation.

### Manual Creation

Data products live in a `data-products` folder. EventCatalog discovers any `index.mdx` file inside a `data-products` directory, regardless of where that directory lives in your catalog.

You can place data products:

At the root of your catalog:

<ProjectTree
  items={[
    {
      name: 'data-products',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'OrderAnalytics',
          type: 'folder',
          defaultOpen: true,
          children: [
            { name: 'index.mdx', highlight: true },
            { name: 'fact-orders-contract.json' },
          ],
        },
        {
          name: 'PaymentMetrics',
          type: 'folder',
          defaultOpen: true,
          children: [
            { name: 'index.mdx', highlight: true },
            { name: 'payment-contract.json' },
          ],
        },
      ],
    },
  ]}
/>

Inside a domain:

<ProjectTree
  items={[
    {
      name: 'domains',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'E-Commerce',
          type: 'folder',
          defaultOpen: true,
          children: [
            {
              name: 'data-products',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'CustomerSegmentation',
                  type: 'folder',
                  defaultOpen: true,
                  children: [{ name: 'index.mdx', highlight: true }],
                },
              ],
            },
          ],
        },
      ],
    },
  ]}
/>

The contents are split into two sections: **frontmatter** and **markdown content**.

## Create the data product file

Create an `index.mdx` file for the data product.

Here is an example data product markdown file. [You can read the data product reference](/docs/development/guides/resources/data-products/reference).

```md title="/data-products/OrderAnalytics/index.mdx (example)"
---
# Unique identifier for your data product
id: order-analytics

# Display name rendered in EventCatalog
name: Order Analytics

# Version of the data product
version: 1.0.0

# Brief summary of what this data product provides
summary: Aggregated order metrics and KPIs for business intelligence

# Optional owners (references teams or users)
owners:
  - dboyne

# Optional badges for categorization
badges:
  - content: Analytics
    backgroundColor: purple
    textColor: purple
  - content: dbt
    backgroundColor: orange
    textColor: orange

# Input dependencies (events, services, data stores)
inputs:
  - id: OrderConfirmed
    # version is optional for all inputs
    version: 1.0.0
  - id: PaymentProcessed
  - id: payment-cache

# Output data products (events, services, data stores)
outputs:
  - id: OrderMetricsCalculated
    # version is optional for all outputs
    version: 1.0.0
  - id: NotificationService
  - id: orders-db
    contract:
      path: fact-orders-contract.json
      name: Fact Orders Contract
      type: json-schema
---

## Overview

The Order Analytics data product transforms raw order and payment events into aggregated metrics optimized for reporting and business intelligence.

<NodeGraph />

Rest of your markdown....
```

