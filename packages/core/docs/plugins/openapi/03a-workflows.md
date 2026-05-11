---
sidebar_position: 1
keywords:
- components
sidebar_label: Workflows  
title: Workflows
description: Workflows of OpenAPI with EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

There are a few ways to configure the OpenAPI plugin depending on your preferred development workflows.
Many companies have different needs, so we have provided a few different workflows to choose from.

- [Simple mapping between OpenAPI files and EventCatalog services](#simple-mapping-between-openapi-files-and-eventcatalog-services)
  - Map a single OpenAPI file to a single EventCatalog service
- [Independent message versions from your OpenAPI file](#independent-message-versions-from-your-openapi-file)
  - Version your messages independently of the service version
- [Mapping multiple OpenAPI files to a single EventCatalog service](#mapping-multiple-openapi-files-to-a-single-eventcatalog-service)
  - Map multiple OpenAPI files to a single EventCatalog service
- [Mapping OpenAPI and AsyncAPI files to the same EventCatalog service](#mapping-openapi-and-asyncapi-files-to-the-same-eventcatalog-service)
  - Map an OpenAPI and AsyncAPI file to the same EventCatalog service

_If we are missing a workflow that you think is useful, please raise an [issue on GitHub](https://github.com/event-catalog/generators/issues)._  

## Simple mapping between OpenAPI files and EventCatalog services

This is the simplest workflow and is useful if you have a single OpenAPI file per service.

EventCatalog will parse your OpenAPI file and map it's specification to the service you define. 

This will document your service, and the messages it produces and consumes.

```js title="eventcatalog.config.js"
// ...rest of file
generators: [
  [
    '@eventcatalog/generator-openapi',
    {
      services: [
        // Tell EventCatalog where the OpenAPI file is located and map it to the service you define
        { path: path.join(__dirname, 'openapi-files', 'orders-service.yml'), id: 'orders-service' },
      ],
    },
  ],
],
```

### Independent message versions from your OpenAPI file

This is useful if you want to version your messages separately from the OpenAPI file.

OpenAPI currently does not support versioning messages separately from the OpenAPI file, that's why you have to use the `x-eventcatalog-message-version` extension.

You can use the `x-eventcatalog-message-version` extension to specify a different version for a particular message.

```yaml
openapi: 3.0.0
info:
  title: Orders Service
  version: 1.0.0
paths:
  /orders:
    get:
      summary: List all orders
      operationId: listOrders
      # Specify the version of the message to 2.0.0
      x-eventcatalog-message-version: 2.0.0
      tags:
        - orders
      responses:
        '200':
          description: A list of orders
          content:
            application/json:
```

In the example above, the message `listOrders` will be versioned as `2.0.0` and all other messages will be versioned as `1.0.0`.

You can read more about message versioning in the [Features](/docs/plugins/openapi/features#defining-message-versions) section.

## Mapping multiple OpenAPI files to a single EventCatalog service

This is useful if you have a single service that produces and consumes multiple OpenAPI versions.

Some people call this a "polyglot" service, as it produces and consumes multiple APIs.

```js title="eventcatalog.config.js"
// ...rest of file
generators: [
  [
    '@eventcatalog/generator-asyncapi',
    {
      services: [
        // Version 1 of the OpenAPI file
        { path: path.join(__dirname, 'openapi-files', 'orders-service-v1.yml'), id: 'orders-service' },
        // Version 2 of the AsyncAPI File
        { path: path.join(__dirname, 'openapi-files', 'orders-service-v2.yml'), id: 'orders-service' },
      ],
    },
  ],
],
```

:::info Versioning
When you map multiple versions of an OpenAPI file to a single service, the `version` property in your OpenAPI files needs to be the same.

If they are different, EventCatalog will version the previous versions of your service.

In the example above, the `version` property in the OpenAPI files is `1.0.0` and `2.0.0`.

EventCatalog will version the service as `1.0.0` and `2.0.0`.

The messages in the service will be versioned as `1.0.0` and `2.0.0`.

This allows you to track the history of your service and the messages in it.

:::

## Mapping OpenAPI and AsyncAPI files to the same EventCatalog service

<AddedIn version="5.1.1" pkg="@eventcatalog/generator-asyncapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>
<AddedIn version="7.6.1" pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

This is useful if you have a single service that produces and consumes both OpenAPI and AsyncAPI files.

In this example we map an OpenAPI file and an AsyncAPI file to the same service (inventory-service). 

The OpenAPI and AsyncAPI may have their own versions independent of each other, but EventCatalog will document both of them in the same service.

:::tip Message Versioning
You can still use the `x-eventcatalog-message-version` extension to version your messages independently of the service version.
:::

```js title="eventcatalog.config.js"
// ...rest of file
generators: [
    [
      "@eventcatalog/generator-openapi",
      {
        services: [{ path: path.join(__dirname, "specifications", "openapi.yml"), id: "inventory-service", version: "15.2.0" }],
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