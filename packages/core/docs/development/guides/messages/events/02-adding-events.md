---
sidebar_position: 2
keywords:
- EventCatalog events
sidebar_label: Creating an event
title: Creating events
description: Creating and managing events within EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

Events live in a `/events` folder. This folder can be placed:

- At the root of your catalog, or
  - `/events/{Event Name}/index.mdx` 
- Inside a specific service folder.
  - `/services/{Service Name}/events/{Event Name}/index.mdx` 

The contents are split into two sections, **frontmatter** and the **markdown content**.

_Here is an example of what a event markdown file may look like._

```md title="/events/InventoryAdjusted/index.mdx (example)"
---
# id of your event, used for slugs and references in EventCatalog.
id: InventoryAdjusted

# Display name of the event, rendered in EventCatalog
name: Inventory Adjusted

# Version of the event
version: 0.0.4

# Short summary of your event
summary: |
  Event with the intent to adjust the inventory

# Optional owners, references teams or users
owners:
    - dboyne

# Optional badges, rendered to UI by EventCatalog
badges:
    - content: New service
      backgroundColor: blue
      textColor: blue
---

## Overview

The `Inventory Adjusted` event represents intent to adjust the inventory of a given item.

<NodeGraph />

```

Once this file is added, the event will automatically appear across EventCatalog.

## Writing event content

You can write any Markdown inside an event. 

Each event gets its own page, so use this space to fully explain how it works.

You can also use [interactive components](/docs/development/components/using-components) to enrich your documentation.

## Assign producers and consumers to your event

To add producers or consumers to your event you can read the [guide on adding messages to services](/docs/development/guides/messages/common/map-to-producers-and-consumers).

You can also assign your event to one or more [channels](/docs/development/guides/channels/adding-messages-to-services) (e.g Kafka, RabbitMQ, AWS SQS, AWS SNS, etc).

<AddedIn version="3.18.0" />

## Document an HTTP operation

If your event is tied to an HTTP endpoint, you can use the `operation` field to document the method, path, and expected status codes.

```md title="/events/OrderCreated/index.mdx (example)"
---
id: OrderCreated
# ...
operation:
  method: POST
  path: /orders
  statusCodes:
    - "201"
    - "400"
---
```

When defined, the visualiser shows an HTTP method badge, the API path, and colored status code pills on the event node. See the [event API reference](/docs/api/event-api#operation) for all available options.

## Adding schemas to your event

You can add any schema format to your event, you can read the [guide on adding schemas to messages](/docs/development/guides/messages/common/adding-schemas).

## What should I document?

There’s no strict structure, but consider including:

- Purpose – What does this event do and why does it exist?
- How to trigger it – APIs, SDKs, or UI actions
- Schema – Payload structure and validation rules
- Ownership – Who maintains this event?
- Contributing – How others can propose changes

## Custom icon

<AddedIn version="3.28.1" />

Set `styles.icon` in your frontmatter to display a custom icon on the event. The icon appears in the visualiser node, sidebar navigation, page header, and search results.

```md title="/events/InventoryAdjusted/index.mdx (example)"
---
id: InventoryAdjusted
name: Inventory Adjusted
version: 0.0.4
styles:
  icon: /icons/events/eventbridge.svg
---
```

The value can be a path to a file in your catalog's `public/` folder (e.g. `/icons/events/eventbridge.svg`) or an absolute URL (e.g. `https://cdn.simpleicons.org/amazoneventbridge`).

## How do events appear in EventCatalog?

![Example](../../img/events/example.png)


