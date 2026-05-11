---
sidebar_position: 1
keywords:
- EventCatalog GitHub plugin
sidebar_label: Plugin Configuration
title: Plugin Configuration
description: Configuration of the EventCatalog GitHub plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';

# Plugin Configuration

## Overview

The EventCatalog GitHub plugin is configured in the `eventcatalog.config.js` file inside the `generators` array.


## Required Configuration Options

| Option | Type | Required | Example | Description |
|--------|------|----------|---------|-------------|
| `source` | `string` | Yes | `https://github.com/event-catalog/eventcatalog.git` | The HTTP or SSH URL of the GitHub repository. |
| `path` | `string` | Yes | `examples/default` | The path to the directory in the repository that contains the schemas. |


## Optional Configuration Options

<AddedIn version="1.0.0" pkg="@eventcatalog/generator-github" url="https://github.com/event-catalog/generators/releases/tag/v"/>

### Authentication

| Option | Type | Required | Example | Description |
|--------|------|----------|---------|-------------|
| `token` | `string` | No | `process.env.MY_GITHUB_TOKEN` | GitHub personal access token or GitHub App installation token for private repository access. Can also be set via `EVENTCATALOG_GITHUB_TOKEN` environment variable. |

<details>
<summary>See an example configuration - Private repository authentication</summary>

Access private repositories by providing a GitHub token.

```js
// ...rest of eventcatalog.config.js file
generators: [
  [
    '@eventcatalog/generator-github',
    {
      source: 'https://github.com/your-org/private-repo',
      path: 'schemas',
      token: process.env.GITHUB_TOKEN,
      messages: [
        {
          id: 'order-placed',
          schemaPath: 'order-placed.avro',
          type: 'event',
        },
      ]
    }
  ]
]
```
</details>

### Messages

You can assign schemas to messages (events, commands, or commands) in EventCatalog.

:::tip Documentation
Remember the GitHub plugin will keep your schemas in sync with your messages. Any documentation (markdown) added to your messages will be persisted between imports and versions.
:::

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `messages` | object | - | - | List of messages to assign the schemas to. |
| `messages.id` | string | Yes | - | EventCatalog ID for the message. |
| `messages.name` | string | No | - | Friendly name of the message, if not provided the message id will be used. |
| `messages.version` | string | No | - | Version of the message, recommended you set this to the version of the message in the repository, Defaults to `1`. |
| `messages.schemaPath` | string | Yes | - | The path to your schema file in the repository, relative to the path configured in the `path` option. For example if `path` is `examples/default` and your `schemaPath` is `/schemas/order-placed.avro`, the path used will be `examples/default/schemas/order-placed.avro`. |
| `messages.type` | string | Yes | - | Type of the message (`event`, `command`, or `query`). |

<details>
<summary>See an example configuration - Assign schemas to messages</summary>

In this example we assign schemas to messages.

```js
// ...rest of eventcatalog.config.js file
generators: [
  [
    '@eventcatalog/generator-github',
    {
      source: 'https://github.com/event-catalog/eventcatalog.git',
      path: 'examples/default',
      messages: [
        {
          id: 'order-placed',
          name: 'Order Placed',
          version: '1',
          schemaPath: 'domains/Orders/services/InventoryService/events/InventoryAdjusted/schema.avro',
          type: 'event',
        }, 
        {
          id: 'update-order',
          name: 'Update Order',
          version: '1',
          schemaPath: 'domains/Orders/services/InventoryService/commands/UpdateOrder/schema.avro',
          type: 'command',
        }, 
      ]
    }
  ]
]
```
</details>

### Services

You can assign your schemas to your producers and consumers (services).

:::tip Documentation
Remember the GitHub plugin will keep your schemas in sync with your services. Any documentation (markdown) added to your services will be persisted between imports and versions.
:::


| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `services` | object | - | Yes | List of producers/consumers (services) to assign the schemas to. |
| `services.id` | string | - | Yes | EventCatalog ID for the service. |
| `services.sends` | Message[] | - | No | Configuration to assign schemas to a producer. The schemas and topic defined here will be assigned to the producer. |
| `services.receives` | Message[] | - | No | Configuration to assign schemas to a consumer. The schemas and topic defined here will be assigned to the consumer. |

<details>
<summary>See an example configuration - Assign schemas to producers and consumers</summary>

In this example we assign schemas to producers and consumers (services).

```js
// ...rest of eventcatalog.config.js file
generators: [
  [
    '@eventcatalog/generator-github',
    {
      source: 'https://github.com/event-catalog/eventcatalog.git',
      path: 'examples/default',
      services: [
        {
          id: 'Orders Service',
          // The order service sends these messages...
          sends: [
            {
              id: 'order-placed', 
              name: 'Order Placed',
              version: '1',
              schemaPath: 'domains/Orders/services/InventoryService/events/InventoryAdjusted/schema.avro',
              type: 'event',
            }
          ],
          // The order service receives these messages...
          receives: [{
            {
              id: 'place-order', 
              version: '1',
              schemaPath: 'domains/Orders/services/InventoryService/commands/UpdateOrder/schema.avro',
              type: 'command',
            }
          }]
        }
      ]
    }
  ]
]
```

</details>

### Domains

You can define and assign domains to your services.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `domain.id` | string | - | EventCatalog ID for the domain (e.g `orders-domain`). |
| `domain.name` | string | - | Name of the domain (e.g `Orders Domain`). |
| `domain.version` | string | - | Version of the domain (e.g `1.0.0`). |

<details>
<summary>See an example configuration - Assign a domain to a service</summary>

In this example we assign a domain to a service.

```js
// ...rest of eventcatalog.config.js file
generators: [
  [
    '@eventcatalog/generator-github',
    { 
      source: 'https://github.com/event-catalog/eventcatalog.git',
      path: 'examples/default',
      services: [
        {
          id: 'Orders Service',
          version: '1.0.0',
          sends: [
            {
              id: 'order-placed',
              name: 'Order Placed',
              version: '1',
              schemaPath: 'domains/Orders/services/InventoryService/events/InventoryAdjusted/schema.avro',
              type: 'event',
            }
          ],
          receives: [
            {
              id: 'place-order',
              version: '1',
              schemaPath: 'domains/Orders/services/InventoryService/commands/UpdateOrder/schema.avro',
              type: 'command',
            }
          ]
        }
      ],
      // The list of services are assigned to this domain
      domain: {
        id: 'orders-domain',
        name: 'Orders Domain',
        version: '1.0.0',
      }
    }
  ]
]
```

</details>


## Need help?

If you have questions or need help, you can join our [Discord community](https://eventcatalog.dev/discord)
or refer to the [Github Plugin examples on GitHub](https://github.com/event-catalog/generators/tree/main/examples/generator-github).














