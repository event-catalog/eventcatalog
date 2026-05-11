---
keywords:
- EventCatalog domains
sidebar_label: Data stores
title: Adding data stores to services
description: Adding data stores to services
slug: adding-data-stores-to-services
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.59.0" />

[Data stores](/docs/development/guides/data/introduction) in EventCatalog are a great way to document which data stores your services write to or read from.

:::info What are data stores?
  Data stores are containers that hold data in your architecture (e.g. databases, caches, object stores, search indexes, etc).

  You can read more about data stores [here](/docs/development/guides/data/introduction).
:::


## Specifying read/write relationships to data stores

To document the read/write relationships to data stores you need to specify the data stores in the **writesTo** or **readsFrom** array within your service frontmatter API.

In the example below the `OrderService` writes to the `OrdersDatabase` and reads from the `ProductRedisCache`.

```md title="/services/Orders/index.mdx (example)"
---
id: OrderService
... # other service frontmatter
writesTo:
    # id of the data store this service writes to
    - id: OrdersDatabase
readsFrom:
    # id of the data store this service reads from
    - id: ProductRedisCache
      # optional version of the data store if none provided latest will be used
      version: 0.0.1
---

```

### Using semver versioning

<AddedIn version="2.4.0" />

You can use [semver](https://semver.org/) syntax when referencing your data stores in your services.

```md title="/domains/Orders/index.mdx (example)"
---
id: PaymentDomain
... # other domain frontmatter
writesTo:
    # Latest minor version of OrdersDatabase will be added
    - id: OrdersDatabase
      version: 0.x.1
    # Minor and patches of this version will be linked
    - id: ProductRedisCache
      version: ^1.0.1
    # Latest version of this data store will be shown by default.
    - id: OrdersDatabase
---
<!-- Markdown contents... -->

```

You can choose not to provide a version for a data store. If no version is given **latest** is used by default.

### Visualizing data stores within a service

When data stores get added within your services EventCatalog will visualize this for you either using the `NodeGraph` component or through the visualizer.

![Example](../../img/services/visualiser-with-data.png)

You can see an example of this [here](https://demo.eventcatalog.dev/visualiser/services/OrdersService/0.0.3)