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
  - Attach multiple OpenAPI specifications to one service version
- [Creating versioned service records](#creating-versioned-service-records)
  - Use separate service entries when each specification represents a service version
- [Versioning a service on a later generator run](#versioning-a-service-on-a-later-generator-run)
  - Preserve the current service as history when a newer version is generated
- [Mapping OpenAPI and AsyncAPI files to the same EventCatalog service](#mapping-openapi-and-asyncapi-files-to-the-same-eventcatalog-service)
  - Map an OpenAPI and AsyncAPI file to the same EventCatalog service

_If we are missing a workflow that you think is useful, please raise an [issue on GitHub](https://github.com/event-catalog/generators/issues)._  

## Simple mapping between OpenAPI files and EventCatalog services

This is the simplest workflow and is useful if you have a single OpenAPI file per service.

EventCatalog will parse your OpenAPI file and map its specification to the service you define.

If you do not configure a service `version`, the OpenAPI document's `info.version` is used.

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

You can read more about message versioning in the [Features](/docs/plugins/openapi/features#custom-versioning-with-x-eventcatalog-message-version) section.

## Mapping multiple OpenAPI files to a single EventCatalog service

This is useful when one version of a service exposes multiple OpenAPI contracts, for example a public API and an administration API.

Use a `path` array in one service entry. One service entry represents one EventCatalog service version, so every OpenAPI file in the array is attached to that version and rendered in the service's `specifications` list.

```js title="eventcatalog.config.js"
// ...rest of file
generators: [
  [
    '@eventcatalog/generator-openapi',
    {
      services: [
        {
          id: 'orders-service',
          version: '3.0.0',
          path: [
            path.join(__dirname, 'openapi-files', 'orders-public-api.yml'),
            path.join(__dirname, 'openapi-files', 'orders-admin-api.yml'),
          ],
        },
      ],
    },
  ],
],
```

The generated service contains both specifications:

```yaml
id: orders-service
version: 3.0.0
specifications:
  - type: openapi
    path: orders-public-api.yml
    name: Orders Public API
  - type: openapi
    path: orders-admin-api.yml
    name: Orders Admin API
```

:::info Choosing the service version
When `version` is configured on the service entry, it takes precedence over the `info.version` values in the OpenAPI files.

When `version` is omitted, the generator uses the highest OpenAPI `info.version` from the `path` array. Versions are compared semantically, so `10.0.0` is considered newer than `2.0.0`. Every specification in the array is then attached to that selected service version.

A `path` array does not create historical service records. Use separate service entries if the files represent different versions of the service.
:::

## Creating versioned service records

Use a separate service entry for each service version when you want to keep multiple versions in EventCatalog. Set `version` explicitly to make the intended service lifecycle clear.

```js title="eventcatalog.config.js"
// ...rest of file
generators: [
  [
    '@eventcatalog/generator-openapi',
    {
      services: [
        {
          id: 'orders-service',
          version: '1.0.0',
          path: path.join(__dirname, 'openapi-files', 'orders-service-v1.yml'),
        },
        {
          id: 'orders-service',
          version: '2.0.0',
          path: path.join(__dirname, 'openapi-files', 'orders-service-v2.yml'),
        },
      ],
    },
  ],
],
```

In this example, `2.0.0` becomes the current service. Version `1.0.0` and its OpenAPI specification are stored as a historical service record under `versioned/1.0.0`. Each service version references only the OpenAPI specification configured for that entry.

You can also use a `path` array inside either entry if that particular service version has multiple OpenAPI specifications.

## Versioning a service on a later generator run

You do not need to keep every historical version in `eventcatalog.config.js` forever. If `orders-service` is generated as `1.0.0` today and the configured OpenAPI file changes to `2.0.0` later, running the generator again will:

1. Move the existing `1.0.0` service and its OpenAPI specification into the service's versioned history.
2. Generate `2.0.0` as the current service with the new OpenAPI specification.

This works when the service version comes from OpenAPI `info.version` or from an explicit `version` in the service configuration. If you configure `version`, update it when you intend to create a new service version.

:::tip Multiple contracts versus service history
Use one entry with `path: []` for multiple contracts belonging to the same service version. Use separate entries, or update the version on a later run, to create service history.
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
