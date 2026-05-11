---
sidebar_position: 5
keywords:
- EventCatalog
- services 
- owners
sidebar_label: Deprecating data stores  
title: Deprecating data stores
description: Deprecating data stores with EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.59.0" />

Any resource in EventCatalog can be deprecated or marked as deprecated.

This will show a banner on the page indicating that the resource is deprecated.

## Deprecating data stores using frontmatter

To deprecate a data store you need to add the `deprecated` field to the data store frontmatter API.

This accepts a `boolean` or an `object` with the following properties:

- `date`: Date the service will be or was deprecated (YYYY-MM-DD)
- `message`: Reason the service is deprecated, supports markdown (optional)

```md title="/services/OrderService/containers/OrderDatabase/index.mdx (example)"
---
id: OrderDatabase
... # other data store frontmatter

# deprecated as an object (Recommended)
deprecated:
  # Date the data store will be or was deprecated (YYYY-MM-DD)
  date: 2025-01-01
  # Reason the data store is deprecated, supports markdown (optional)
  message: | 
    This data store has been deprecated and replaced by the new data store **OrderDatabaseV2**.
    Please contact the [team for more information](mailto:inventory-team@example.com) or visit our [website](https://eventcatalog.dev).

# deprecated as a boolean 
deprecated: true
---

```

Configuration:

- `deprecated`: `boolean` or `object`

Deprecated as an object is recommended, as it gives your users more information to why the resource is deprecated and a date in the past or future.

- `deprecated.date`: Date the data store will be or was deprecated (YYYY-MM-DD)
- `deprecated.message`: Reason the data store is deprecated, supports markdown (optional)


#### Rendered output

Example of resource that will be deprecated:

![Deprecating services](../../img/deprecated/will-be-deprecated-data-store.png) 

Example of resource that is deprecated:

![Deprecating services](../../img/deprecated/is-deprecated-data-store.png) 

#### Demo

You can see a demo of deprecating resources in the [EventCatalog demo site](https://demo.eventcatalog.dev/docs/services/InventoryService/0.0.2).
