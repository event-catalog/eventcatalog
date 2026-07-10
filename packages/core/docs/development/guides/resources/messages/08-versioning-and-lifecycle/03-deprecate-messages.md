---
keywords:
- EventCatalog
- messages  
- deprecating
sidebar_label: Deprecate messages
title: Deprecate messages
description: Deprecating messages with EventCatalog.
sidebar_position: 4
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.33.10" />

Any resource in EventCatalog can be deprecated or marked as deprecated.

This will show a banner on the page indicating that the resource is deprecated.

## Deprecating messages using frontmatter

To deprecate a message you need to add the `deprecated` field to the message frontmatter API.

This accepts a `boolean` or an `object` with the following properties:

- `date`: Date the message will be or was deprecated (YYYY-MM-DD)
- `message`: Reason the message is deprecated, supports markdown (optional)

```md title="/{events|commands|queries}/UpdateInventory/index.mdx (example)"
---
id: UpdateInventory
... # other message frontmatter

# deprecated as an object (Recommended)
deprecated:
  # Date the event will be or was deprecated (YYYY-MM-DD)
  date: 2025-01-01
  # Reason the event is deprecated, supports markdown (optional)
  message: | 
    This message has been deprecated and replaced by the new message **UpdateInventoryV2**.
    Please contact the [team for more information](mailto:inventory-team@example.com) or visit our [website](https://eventcatalog.dev).

# deprecated as a boolean 
deprecated: true
---

```

Configuration:

- `deprecated`: `boolean` or `object`

Deprecated as an object is recommended, as it gives your users more information to why the resource is deprecated and a date in the past or future.

- `deprecated.date`: Date the message will be or was deprecated (YYYY-MM-DD)
- `deprecated.message`: Reason the message is deprecated, supports markdown (optional)


#### Rendered output

Example of resource that will be deprecated:

  ![Deprecating messages](../../../img/deprecated/will-be-deprecated.png) 

Example of resource that is deprecated:

![Deprecating messages](../../../img/deprecated/is-deprecated.png) 

#### Demo

You can see a demo of deprecating resources in the [EventCatalog demo site](https://demo.eventcatalog.dev/docs/services/InventoryService/0.0.2).
