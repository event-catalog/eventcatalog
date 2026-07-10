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
