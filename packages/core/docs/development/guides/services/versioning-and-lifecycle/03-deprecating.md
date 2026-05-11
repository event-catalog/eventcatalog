---
keywords:
- EventCatalog
- services 
- owners
sidebar_label: Deprecating services
title: Deprecating services
description: Deprecating services with EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.33.10" />

Any resource in EventCatalog can be deprecated or marked as deprecated.

This will show a banner on the page indicating that the resource is deprecated.

## Deprecating services using frontmatter

To deprecate a service you need to add the `deprecated` field to the service frontmatter API.

This accepts a `boolean` or an `object` with the following properties:

- `date`: Date the service will be or was deprecated (YYYY-MM-DD)
- `message`: Reason the service is deprecated, supports markdown (optional)

```md title="/services/OrderService/index.mdx (example)"
---
id: OrderService
... # other service frontmatter

# deprecatd as an object (Recommended)
deprecated:
  # Date the service will be or was deprecated (YYYY-MM-DD)
  date: 2025-01-01
  # Reason the service is deprecated, supports markdown (optional)
  message: | 
    This service has been deprecated and replaced by the new service **InventoryServiceV2**.
    Please contact the [team for more information](mailto:inventory-team@example.com) or visit our [website](https://eventcatalog.dev).

# deprecated as a boolean 
deprecated: true
---

```

Configuration:

- `deprecated`: `boolean` or `object`

Deprecated as an object is recommended, as it gives your users more information to why the resource is deprecated and a date in the past or future.

- `deprecated.date`: Date the service will be or was deprecated (YYYY-MM-DD)
- `deprecated.message`: Reason the service is deprecated, supports markdown (optional)


#### Rendered output

Example of resource that will be deprecated:

![Deprecating services](../../img/deprecated/will-be-deprecated.png) 

Example of resource that is deprecated:

![Deprecating services](../../img/deprecated/is-deprecated.png) 

#### Demo

You can see a demo of deprecating resources in the [EventCatalog demo site](https://demo.eventcatalog.dev/docs/services/InventoryService/0.0.2).
