---
sidebar_position: 1
keywords:
- components
sidebar_label: Introduction
title: Using components
description: Understanding components
---

EventCatalog uses [MDX](https://mdxjs.com/) under the hood. This gives you the ability to include predefined components inside your contents.

You can add components to your domains, services or messages.

## Quick links

In addition to components, use wiki-style syntax for inline resource references with interactive tooltips:

```md
The [[service|OrdersService]] processes [[event|OrderCreated]] messages.
```

See [Resource references](/docs/development/components/resource-references) for details.

### Example

You can include any component inside the markdown content. This example renders an Accordion component within an event.

```md title="/events/Orders/OrderAmended/index.mdx"
---
id: OrderAmended
name: Order amended
version: 0.0.1
summary: |
  Indicates an order has been changed
owners:
    - dboyne
    - msmith
badges:
    - content: Recently updated!
      backgroundColor: green
      textColor: green
    - content: Channel:Apache Kafka
      backgroundColor: yellow
      textColor: yellow
---

## Overview

Event is raised when an order has been changed.

<Accordion title="Learn how to raise this event">
  You can run the following command to raise this event.

  ```sh
  bin/kafka-topics.sh --create --topic OrderAmended --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
  ``
</Accordion>

```


![Example](./img/accordian.png)





