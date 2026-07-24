---
sidebar_position: 1
keywords:
- components
sidebar_label: Workflows  
title: Workflows
description: Workflows of AsyncAPI with EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

There are a few ways to configure the AsyncAPI plugin depending on your preferred development workflows.
Many companies have different needs, so we have provided a few different workflows to choose from.

- [Simple mapping between AsyncAPI files and EventCatalog services](#simple-mapping-between-asyncapi-files-and-eventcatalog-services)
  - Map a single AsyncAPI file to a single EventCatalog service
- [Shared message contracts across producer and consumer specs](#shared-message-contracts-across-producer-and-consumer-specs)
  - Keep the producer's message contract authoritative when several services reference it
- [Independent message versions from your AsyncAPI file](#independent-message-versions-from-your-asyncapi-file)
  - Version your messages independently of the service version
- [Mapping multiple AsyncAPI files to a single EventCatalog service](#mapping-multiple-asyncapi-files-to-a-single-eventcatalog-service)
  - Map multiple AsyncAPI files to a single EventCatalog service
- [Mapping AsyncAPI and OpenAPI files to the same EventCatalog service](#mapping-asyncapi-and-openapi-files-to-the-same-eventcatalog-service)
  - Map an AsyncAPI and OpenAPI file to the same EventCatalog service

_If we are missing a workflow that you think is useful, please raise an [issue on GitHub](https://github.com/event-catalog/generators/issues)._  

## Simple mapping between AsyncAPI files and EventCatalog services

This is the simplest workflow and is useful if you have a single AsyncAPI file per service.

EventCatalog will parse your AsyncAPI file and map it's specification to the service you define. 

This will document your service, and the messages it produces and consumes.

```js title="eventcatalog.config.js"
// ...rest of file
generators: [
  [
    '@eventcatalog/generator-asyncapi',
    {
      services: [
        // Tell EventCatalog where the AsyncAPI file is located and map it to the service you define
        { path: path.join(__dirname, 'asyncapi-files', 'orders-service.yml'), id: 'orders-service' },
      ],
    },
  ],
],
```

## Shared message contracts across producer and consumer specs

This workflow is useful when several AsyncAPI files describe the same message. For example, an order service may send `OrderPlaced` while notification and fulfillment services receive it.

EventCatalog stores one shared message contract for a given message ID and version. Without an explicit `x-eventcatalog-role`, the generator uses the AsyncAPI operation direction to determine how each service relates to that contract:

- `send` or `publish` operations own the message contract and may update it.
- `receive` or `subscribe` operations reference an existing contract without overwriting it.
- A receiver creates a fallback from its own AsyncAPI definition only when the message does not exist yet.
- If the producer is generated after a receiver fallback, the producer's definition replaces the fallback and becomes authoritative.

The services can be configured in either order:

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-asyncapi',
    {
      services: [
        { path: path.join(__dirname, 'asyncapi-files', 'notification-service.yml'), id: 'notification-service' },
        { path: path.join(__dirname, 'asyncapi-files', 'order-service.yml'), id: 'order-service' },
      ],
    },
  ],
],
```

Given these operations, `order-service` owns `OrderPlaced` and `notification-service` references it:

```yaml title="order-service.yml"
operations:
  sendOrderPlaced:
    action: send
    channel:
      $ref: '#/channels/orders'
    messages:
      - $ref: '#/channels/orders/messages/OrderPlaced'
```

```yaml title="notification-service.yml"
operations:
  receiveOrderPlaced:
    action: receive
    channel:
      $ref: '#/channels/orders'
    messages:
      - $ref: '#/channels/orders/messages/OrderPlaced'
```

Both services remain connected to the message: the producer has an entry in `sends` and the consumer has an entry in `receives`. Only the producer can replace the shared contract.

:::tip Explicit ownership
If a receiving operation should own the contract, add `x-eventcatalog-role: provider` to that operation or message. Use `x-eventcatalog-role: client` when a sending or receiving service should only record its relationship and must never create the message documentation.

Read [Defining message ownership roles](/docs/plugins/asyncapi/features#defining-message-ownership-roles) for the complete rules.
:::

## Independent message versions from your AsyncAPI file

This is useful if you want to version your messages separately from the AsyncAPI file.

AsyncAPI currently does not support versioning messages separately from the AsyncAPI file, that's why you have to use the `x-eventcatalog-message-version` extension.

You can use the `x-eventcatalog-message-version` extension to specify a different version for a particular message.

```yaml
asyncapi: 3.0.0
info:
  title: Orders Service
  version: 1.0.0
components:
  messages:
    OrderCreated:
      description: 'Event triggered when an order is created'
      # Specify the version of the message to 2.0.0
      x-eventcatalog-message-version: 2.0.0
      payload:
        type: object
        properties:
          orderId:
            type: string
            description: The ID of the order
```

In the example above, the message `OrderCreated` will be versioned as `2.0.0` and all other messages will be versioned as `1.0.0`.

You can read more about message versioning in the [Features](/docs/plugins/asyncapi/features#defining-message-versions) section.

## Mapping multiple AsyncAPI files to a single EventCatalog service

This is useful if you have a single service that produces and consumes multiple AsyncAPI versions.

Some people call this a "polyglot" service, as it produces and consumes multiple APIs.

```js title="eventcatalog.config.js"
// ...rest of file
generators: [
  [
    '@eventcatalog/generator-asyncapi',
    {
      services: [
        // Version 1 of the AsyncAPI file
        { path: path.join(__dirname, 'asyncapi-files', 'orders-service-v1.yml'), id: 'orders-service' },
        // Version 2 of the AsyncAPI File
        { path: path.join(__dirname, 'asyncapi-files', 'orders-service-v2.yml'), id: 'orders-service' },
      ],
    },
  ],
],
```

:::info Versioning
When you map multiple versions of an AsyncAPI file to a single service, the `version` property in your AsyncAPI files needs to be the same.

If they are different, EventCatalog will version the previous versions of your service.

In the example above, the `version` property in the AsyncAPI files is `1.0.0` and `2.0.0`.

EventCatalog will version the service as `1.0.0` and `2.0.0`.

The messages in the service will be versioned as `1.0.0` and `2.0.0`.

This allows you to track the history of your service and the messages in it.

:::

## Mapping AsyncAPI and OpenAPI files to the same EventCatalog service

<AddedIn version="5.1.1" pkg="@eventcatalog/generator-asyncapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>
<AddedIn version="7.6.1" pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

This is useful if you have a single service that produces and consumes both AsyncAPI and OpenAPI files.

In this example we map an OpenAPI file and an AsyncAPI file to the same service (inventory-service). 

The AsyncAPI and OpenAPI may have their own versions independent of each other, but EventCatalog will document both of them in the same service.

:::tip Message Versioning
You can still use the `x-eventcatalog-message-version` extension to version your messages independently of the service version.
:::

```js title="eventcatalog.config.js"
// ...rest of file
generators: [
    [
      "@eventcatalog/generator-openapi",
      {
        services: [
          { path: path.join(__dirname, "specifications", "openapi.yml"), id: "inventory-service", version: "15.2.0" },
        ],
      },
    ],
    [
      "@eventcatalog/generator-asyncapi",
      {
        services: [{ path: path.join(__dirname, "specifications", "asyncapi.yml"), id: "inventory-service", version: "15.2.0" }],
      },
    ],
  ],
```
