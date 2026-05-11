---
sidebar_position: 5
keywords:
  - EventCatalog domains
  - domain data products
sidebar_label: Adding data products to domains
title: Adding data products to domains
description: Organize analytics and data assets within domain boundaries.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.8.0" />

Adding [data products](/docs/development/guides/data-products/introduction) to your domains allows you to document which analytical assets and data pipelines belong to a domain.

Data products can live anywhere in your catalog, at the domain level or in their own folder. You just need to reference them in your domain frontmatter.

## Adding data products using frontmatter

To add data products to a domain you need to add them to the `data-products` array within your domain frontmatter API.

```md title="/domains/E-Commerce/index.mdx (example)"
---
id: e-commerce
name: E-Commerce
version: 1.0.0

data-products:
  # id of the data product you want to add
  - id: order-analytics
    # (optional) The version of the data product you want to add.
    # If no version is given the latest version of the data product will be used.
    version: 1.0.0

  # version is optional for all data products
  - id: payment-analytics
---

<!-- Markdown content... -->

```

The `data-products` field in your domain tells EventCatalog which data products belong to this domain.

In the example above we can see that the `order-analytics` and `payment-analytics` data products belong to the `e-commerce` domain.

## Using semver versioning

<AddedIn version="3.8.0" />

You can use [semver](https://semver.org/) syntax when referencing data products in your domains.

```md title="/domains/E-Commerce/index.mdx (example)"
---
id: e-commerce
name: E-Commerce
version: 1.0.0

data-products:
  # Latest minor/patch version of order-analytics will be used
  - id: order-analytics
    version: 1.x.x
  # Latest patch version of payment-analytics will be used
  - id: payment-analytics
    version: 2.0.x
  # Latest version of fulfillment-metrics will be used
  - id: fulfillment-metrics
---

<!-- Markdown content... -->

```

Although it's recommended to link to a version of a data product it is now optional. If no version is given the latest version is used by default.

## Visualizing data products within a domain

Data products are shown in the sidebar of your domain under a "Data Products" section. You can also display them in a grid alongside other domain resources.

```md title="/domains/E-Commerce/index.mdx"
---
id: e-commerce
name: E-Commerce
version: 1.0.0

data-products:
  - id: order-analytics
  - id: payment-analytics
---

## Data Products

Our analytical capabilities include order metrics, payment insights, and fulfillment KPIs.

```

## Making changes and versioning

You can make as many changes as you want, but if you are adding or removing data products you may want to consider versioning your domain. This allows you to keep historic changes, and let others understand why data products are coming in or out of a particular domain.

## See also

- [Data products guide](/docs/development/guides/data-products/introduction)
- [Adding data products to domains](/docs/development/guides/data-products/adding-to-domains)
