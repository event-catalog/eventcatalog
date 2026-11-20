---
keywords:
- EventCatalog channels
- Channel frontmatter
sidebar_label: Reference
title: Message channels reference
description: Frontmatter fields, paths, and routes for channels in EventCatalog.
---

This page lists the fields, paths, and routes supported by channels.

## Paths

Channels can be created in any `channels` folder:

```txt
/channels/{Channel Name}/index.mdx
/domains/{Domain Name}/channels/{Channel Name}/index.mdx
/services/{Service Name}/channels/{Channel Name}/index.mdx
```

Versioned channels use:

```txt
/channels/{Channel Name}/versioned/{version}/index.mdx
```

## Routes

| Route | Description |
|-------|-------------|
| `/docs/channels/{channel-id}/{version}` | Channel documentation page. |
| `/visualiser/channels/{channel-id}/{version}` | Channel resource diagram. |

## Required fields

### `id` {#id}

- Type: `string`

Unique id of the channel. EventCatalog uses this for URLs and resource references.

```md title="Example"
---
id: orders-topic
---
```

### `name` {#name}

- Type: `string`

Display name of the channel.

```md title="Example"
---
name: Orders Topic
---
```

### `version` {#version}

- Type: `string`

Version of the channel documentation.

```md title="Example"
---
version: 1.0.0
---
```

## Optional fields

### `summary` {#summary}

- Type: `string`

Short description of the channel.

```md title="Example"
---
summary: Kafka topic that carries ordering events.
---
```

### `owners` {#owners}

- Type: `array`

An array of team or user ids that own the channel.

```md title="Example"
---
owners:
  - ordering-platform
---
```

### `address` {#address}

- Type: `string`

Broker address, topic, stream, queue, or route.

```md title="Example"
---
address: orders.events
---
```

### `protocols` {#protocols}

- Type: `array`

Protocols used by the channel, such as Kafka, HTTP, or AMQP.

```md title="Example"
---
protocols:
  - kafka
---
```

### `deliveryGuarantee` {#deliveryGuarantee}

- Type: `at-most-once`, `at-least-once`, or `exactly-once`

Delivery guarantee for messages on the channel.

```md title="Example"
---
deliveryGuarantee: at-least-once
---
```

### `type` {#type}

- Type: `queue`, `topic`, or `stream`

How the channel delivers messages. A queue gives each message to one consumer (for example SQS), a topic gives every subscription its own copy (for example SNS), and a stream is an ordered log that consumers read at their own offset and can replay (for example a Kafka topic). The visualiser shows each type with its own icon and label, and the sidebar with its own icon.

```md title="Example"
---
type: queue
---
```

### `deadLetterChannel` {#deadLetterChannel}

- Type: `object` (`id`, optional `version`)

The channel that messages go to when they can't be delivered or processed, for example the target of an SQS redrive policy or a RabbitMQ dead letter exchange. Without a version it points to the latest version. The channel it points to is shown as a dead letter channel: a red border and a dark badge with a stop sign on its card ("Dead Letter Queue", "Dead Letter Topic", "Dead Letter Stream" or "Dead Letter Channel", depending on its type), a dashed red "dead-letters to" edge from the bottom of this channel, a stop sign icon in the sidebar, and links between the two in the sidebar ("Dead Letter Channel" and "Dead Letters From") and in `<ChannelInformation />`.

```md title="Example"
---
deadLetterChannel:
  id: orders.queue.dlq
  version: 1.0.0
---
```

### `parameters` {#parameters}

- Type: `object`

Parameter definitions for templated channel addresses.

```md title="Example"
---
parameters:
  region:
    description: Deployment region for the topic.
---
```


### `badges` {#badges}

- Type: `array`

Badges rendered on the channel page.

```md title="Example"
---
badges:
  - content: Kafka
    backgroundColor: purple
    textColor: purple
---
```

## Delivery guarantee

Use `deliveryGuarantee` to describe how messages are delivered on the channel.

Supported values are `at-most-once`, `at-least-once`, and `exactly-once`.

```md
---
deliveryGuarantee: at-least-once
---
```

## Custom properties

You can add organization-specific metadata to this resource using frontmatter fields prefixed with `x-`. Learn how to define, render, and reference them in [Custom properties on resources](/docs/development/customization/custom-properties).
