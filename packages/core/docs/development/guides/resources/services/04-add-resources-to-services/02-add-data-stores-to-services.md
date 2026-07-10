---
keywords:
- EventCatalog domains
sidebar_position: 2
sidebar_label: Add data stores to services
title: Add data stores to services
description: Adding data stores to services
---

import AddedIn from '@site/src/components/MDX/AddedIn';

In EventCatalog a [data store](/docs/development/guides/resources/data/introduction) is a persistent storage system (e.g database, cache, index) that holds information used by one or resources.

Your service can **read** and/or **write** to any data store documented in your catalog.

## Specifying read/write relationships

To document the read/write relationship from a service to a data store you use the **writesTo** or **readsFrom** array within your service frontmatter API.

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
      # also supports sever matching (0.x.x)
      version: 0.0.1
---

```

You can choose not to provide a version for a data store. If no version is given **latest** is used by default.

### Visualizing data stores within a service

When your service reads/writes to a data store, EventCatalog will visualize this relationship [(see example)](https://demo.eventcatalog.dev/visualiser/services/OrdersService/0.0.3)

![Example](../../../img/services/visualiser-with-data.png)
