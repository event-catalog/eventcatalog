---
sidebar_position: 1
keywords:
- components
sidebar_label: Features
title: Features
description: Features of OpenAPI with EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<!-- <AddedIn version="2.6.0"/> -->
<PluginLicense url="#commercial-use" />

<!-- Table -->
| Feature | Use cases |
|---------|-----------|
| [Mapping messages as commands, queries or events](#mapping-messages-as-commands-queries-or-events) | OpenAPI does not have the concept of commands, queries or events, everything is a message (endpoint). Using the EventCatalog extension you can map your payloads as commands, queries or events. |
| [Assign owners to your domains, services and messages](#assign-owners-to-your-domains-services-and-messages) | Set ownership of your service, and it's messages. Let your teams understand who owns what. |
| [Creating draft domains, services and messages](#creating-draft-domains-services-and-messages) | Evolve your specifications. Mark endpoints as draft for your teams. This can help you highlight which endpoints are still in development or draft. |
| [Map many OpenAPI files to a single service](#map-many-openapi-files-to-a-single-service) | If your service exposes multiple APIs, you can map many OpenAPI files to a single service. |
| [Custom versioning with x-eventcatalog-message-version](#custom-versioning-with-x-eventcatalog-message-version) | By default this plugin will use the OpenAPI version for all your messages. You can use the `x-eventcatalog-message-version` extension to specify a different version for a particular message. |
| [Fetch OpenAPI files by URL](#fetch-openapi-files-by-url) | You can use the `path` property of the generator to specify a path to your local file system or an external URL, or you can mix both of them. |
| [Authenticate remote URLs](#authenticate-remote-urls) | Use HTTP headers to access protected OpenAPI files from authenticated URLs. |
| [Define EventCatalog ids and names in your OpenAPI specification file](#define-eventcatalog-ids-and-names-in-your-openapi-specification-file) | EventCatalog messages (commands, queries and events) have two important properties, these are `id` and `name`. |
| [Define messages a service sends or receives](#define-messages-a-service-sends-or-receives) | **By default all messages in your OpenAPI spec file are documented as messages that are received by your service** (e.g a route with /getOrders will be a query/command/event that the service accepts). You can override this by using the `x-eventcatalog-message-action` extension. |
| [Deprecating messages](#deprecating-messages) | To mark messages as deprecated you can use the `deprecated` field or the `x-eventcatalog-deprecated-date` and `x-eventcatalog-deprecated-message` extensions. |
| [Persist markdown](#persist-markdown) | When you generate your OpenAPI files your markdown on your domains,services, and messages in EventCatalog is persisted between versions. This allows you to add [custom components](/docs/custom-components), our [MDX components](/docs/components) and customize your EventCatalog pages without losing changes when you version your OpenAPI files. |
| [Automatic versioning](#automatic-versioning) | When you change versions in your OpenAPI file and run generate, your services and messages are automatically versioned. This allows you to keep an audit log of changes between OpenAPI files, schemas and more. |
| [Downloading schemas](#downloading-schemas) | If your messages have schemas EventCatalog will document these for you. Run your generator and every message will show it's schema on the UI and give users the ability to download it's schema. |
| [Parse examples from operations](#parse-examples-from-operations) | Automatically extract request body and response examples from your OpenAPI operations and save them as JSON files alongside your messages in EventCatalog. |
| [Define consumer services](#define-consumer-services) | Declare which services consume the messages generated from an OpenAPI spec, with optional route-based filtering to limit which messages each consumer sends to. |
| [Group messages](#group-messages) | Group related messages together in the visualiser for easier navigation of large APIs. |

### Define consumer services

<AddedIn version="7.11." pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

EventCatalog will document who **owns** the service. You can also define consumers of your APIs. This can help you document which services are calling your endpoints to help with future maintenance of your APIs and develop a shared understanding.

Add a `consumers` array to any service in your generator config to declare which other services send requests to that service. Each consumer entry needs at minimum an `id`; a `version` and `routes` filter are both optional.

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-openapi',
    {
      services: [
        {
          path: path.join(__dirname, 'openapi-files', 'orders-service.yml'),
          id: 'orders-service',
          consumers: [
            // Sends to all messages from the service
            { id: 'audit-service' },
            // Pinned to a specific version
            { id: 'billing-service', version: '1.0.0' },
            // Only messages whose path ends with /events
            { id: 'notifications-service', routes: [{ suffix: '/events' }] },
            // Only messages matching a wildcard pattern
            { id: 'analytics', routes: [{ match: '/api/*/track' }] },
          ],
        },
      ],
      domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
    },
  ],
],
```

#### Route filtering

Route filters let you limit which messages a consumer sends to based on the API path of each operation. Omitting `routes` means the consumer sends to every message from the service.

Each filter object supports four matching strategies:

| Key | Behaviour | Example |
|-----|-----------|---------|
| `path` | Exact match | `{ path: '/orders/{id}' }` |
| `prefix` | Path starts with the value | `{ prefix: '/orders' }` |
| `suffix` | Path ends with the value | `{ suffix: '/events' }` |
| `match` | Wildcard match (`*` spans one or more path segments) | `{ match: '/api/*/track' }` |

All keys in a single filter object must match (AND). Multiple filter objects in the array are evaluated as OR, so a message is included if it satisfies any one of them.

```js title="Filter examples"
// Exact path only
routes: [{ path: '/orders/{id}' }]

// Paths under /orders OR paths ending with /events
routes: [{ prefix: '/orders' }, { suffix: '/events' }]

// Path must start with /api AND end with /events (AND within one object)
routes: [{ prefix: '/api', suffix: '/events' }]

// Wildcard: matches /api/orders/track, /api/payments/track, etc.
routes: [{ match: '/api/*/track' }]
```

#### How consumers are created and updated

When the generator runs, each consumer service is looked up by `id` and `version`. If a consumer service does not yet exist, it is created automatically with a basic `<NodeGraph />` page. New consumers are placed inside the configured `domain` if one is defined.

If the consumer already exists in the catalog, it is updated in-place so its existing markdown, location, and metadata are preserved. The `sends` list on the consumer is merged with the incoming messages, with deduplication applied. If a consumer entry already tracks a versioned message, its version is updated to the latest value from the spec.

---

### Mapping messages as commands, queries or events

OpenAPI does not distinguish between commands, events and queries, everything is a message. 

Using the EventCatalog custom OpenAPI extension you can specify if your messages are queries, commands or events.

You can use the `x-eventcatalog-message-type` to specify the type of message. 

**By default everything parsed by EventCatalog is a query**, unless you specify with the x-eventcatalog-message-type extension.

```yml title="x-eventcatalog-message-type example"
paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      tags:
        - pets
      x-eventcatalog-message-type: query # command,  query, or event
      parameters:
        - name: limit
          in: query
          description: How many items to return at one time (max 100)
          required: false
          schema:
            type: integer
            maximum: 100
            format: int32
```
---

### Assign owners to your domains, services and messages

<AddedIn version="4.0.3" pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

You can set owners to your domains and services. Setting owners to services will also set the owner to all messages in the service.

To do this you can use the `owners` property in the service or domain.

```js title="eventcatalog.config.js"
// ..rest of file
generators: [
  [
    '@eventcatalog/generator-openapi',
    {
      services: [
        // here we assign owners to the service (owners documented in EventCatalog)
        // The owners will also be set to all messages in the service
        { path: path.join(__dirname, 'openapi-files', 'orders-service.yml'), id: 'orders-service', owners: ['dboyne', 'team-1'] },
        // If you don't want to set owners to all messages you can use the setMessageOwnersToServiceOwners flag
        { path: path.join(__dirname, 'openapi-files', 'orders-service.yml'), id: 'orders-service', owners: ['dboyne', 'team-1'], setMessageOwnersToServiceOwners: false },
      ],
      // You can also set owners to the domain, this does not cascade to the services or messages
      domain: { id: 'orders', name: 'Orders', version: '0.0.1', owners: ['dboyne', 'team-1'] },
    },
  ],
],
};

```

---

### Creating draft domains, services and messages

<AddedIn version="7.3.0" pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

You can create draft domains, services and messages in EventCatalog from your OpenAPI files. 

![Draft resources](../img/draft-resource.png)

**Use case:**

- You want to create a service in EventCatalog that is not yet implemented or going through feedback/design phase.
- You want to introduce a new endpoint to your service, but warn users that it is not yet implemented or still in development or draft.
- You want to introduce a whole new domain, but warn users everything in the domain is still in development or draft.

**Getting started**

You have a few options to create draft resources from your specification files.

- `domain.draft` - If true, the domain will be drafted in EventCatalog with all it's services / messages.
- `service.draft` - If true, the service will be drafted in EventCatalog with all it's endpoints / messages.

You can also choose to use OpenAPI extensions to create draft resources.

- `x-eventcatalog-draft` - If true, the resource will be drafted in EventCatalog (e.g service and messages).

<details>
  <summary>Example of creating draft resources through domains (configuration)</summary>

Setting the `draft` property to true will create a draft domain with all it's services and messages in EventCatalog.

```js title="eventcatalog.config.js"
// ..rest of file
generators: [
  [
    '@eventcatalog/generator-openapi',
    {
      domain: { id: 'orders', name: 'Orders', version: '0.0.1', draft: true },
    },
  ],
],
};
```
</details>
<details>
  <summary>Example of creating draft resources through services (configuration)</summary>

Setting the `draft` property to true will create a draft service with all it's messages in EventCatalog.

```js title="eventcatalog.config.js"
// ..rest of file
generators: [
  [
    '@eventcatalog/generator-openapi',
    {
      services: [
        { path: path.join(__dirname, 'openapi-files', 'orders-service.yml'), id: 'orders-service', draft: true },
      ],
    },
  ],
],
};
```

In this example the **Orders Service** and all it's messages will be marked as draft in EventCatalog.
</details>
<details>
  <summary>Example marking service as draft (OpenAPI extension)</summary>

Setting the `x-eventcatalog-draft` extension to true will mark the service as draft in EventCatalog.

```yml title="x-eventcatalog-draft example"
openapi: 3.0.0
info:
  title: Pet Service
  version: 1.0.0
  # Here we mark the service as draft
  x-eventcatalog-draft: true
paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      tags:
        - pets
```

In this example the **Pet Service** and the `/pets` endpoint will be marked as draft in EventCatalog.

</details>
<details>
  <summary>Example marking a message as draft (OpenAPI extension)</summary>

Setting the `x-eventcatalog-draft` extension to true will mark the message as draft in EventCatalog.

```yml title="x-eventcatalog-draft example"
openapi: 3.0.0
info:
  title: Pet Service
  version: 1.0.0
paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      x-eventcatalog-draft: true # This will mark the message as draft
      tags:
        - pets
```

In this example we mark the message `listPets` as draft but the service is not marked as draft in EventCatalog.

This can be useful if you want to introduce a new endpoint, but warn users that it is not yet implemented or still in development or draft.

</details>


---

### Map many OpenAPI files to a single service

<AddedIn version="6.0.0" pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

If your service exposes multiple APIs, you can map many OpenAPI files to a single service.

```js title="eventcatalog.config.js"
// ..rest of file
generators: [
  [
    '@eventcatalog/generator-openapi',
    {
      services: [
        // Here we map two OpenAPI files to a single service
        { 
          path: [
            path.join(__dirname, 'openapi-files', 'orders-service-v1.yml'),
            path.join(__dirname, 'openapi-files', 'orders-service-v2.yml')
          ], 
          id: 'orders-service', owners: ['dboyne', 'team-1'] 
        },
      ],
      // You can also set owners to the domain, this does not cascade to the services or messages
      domain: { id: 'orders', name: 'Orders', version: '0.0.1', owners: ['dboyne', 'team-1'] },
    },
  ],
],
};

```

---

#### How does mapping multiple OpenAPI files to a single service work?

The OpenAPI plugin will parse all the files in the `path` array. The are ordered by version (info.version).

Old versions are parsed first and versioned in your catalog along side the messages.

The latest version is parsed last and will be used as the current version in your catalog.

You can try this demo out for yourself by running the [mapping-many-openapi-files-to-a-service example](https://github.com/event-catalog/generators/tree/main/examples/generator-openapi/mapping-many-openapi-files-to-a-service).

---

### Custom versioning with x-eventcatalog-message-version

<AddedIn version="3.3.2" pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

By default this plugin will use the OpenAPI version for all your messages. 

You can use the `x-eventcatalog-message-version` extension to specify a different version for a particular message.

```yml title="x-eventcatalog-message-version example"
openapi: '3.0.0'
info:
  title: Test Service
  version: 1.0.0
paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      tags:
        - pets
      x-eventcatalog-message-version: 5.0.0
```

In the example above, the message `listPets` will be versioned as `5.0.0` and all other messages will be versioned as `1.0.0`.

This feature lets you control the version of your messages individually.

### Fetch OpenAPI files by URL

<AddedIn version="3.1.0" pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

You can use the `path` property of the generator to specify a path to your local file system or an external URL, or you can mix both of them.

```js
[
    '@eventcatalog/generator-asyncapi',
    {
      services: [
        // Add OpenAPI file by public URL
        { path: "https://raw.githubusercontent.com/event-catalog/generator-openapi/refs/heads/main/examples/product-api/openapi.yml", id: "Product Service"},
        // Add OpenAPI file using file system
        { path: path.join(__dirname, 'openapi-files', 'fraud-detection-service.yml'), "Fraud Service"}
      ],
      domain: { id: 'payment', name: 'Payment', version: '0.0.1' },

      // Parse the YML before we save it to the catalog (optional) (http://localhost:3000/docs/development/plugins/open-api/api#saveParsedSpecFile)
      saveParsedSpecFile: true,

      // Run in debug mode, for extra output, if your AsyncAPI fails to parse, it will tell you why
      debug: true,
    },
  ],
```

:::info URLS for OpenAPI files

The path can be the file path to your local file system or an external URL. The external URL has to be accessible from the machine running the generator.
:::

### Authenticate remote URLs

When fetching OpenAPI files from authenticated URLs, provide HTTP headers using the `headers` property.

This is useful for accessing private specifications from internal registries, API gateways, or other protected endpoints.

```js
[
  '@eventcatalog/generator-openapi',
  {
    services: [
      {
        path: "https://api.example.com/specs/orders-service.openapi.yml",
        id: "orders-service",
        headers: {
          Authorization: 'Bearer your-api-token',
          'X-Api-Key': 'your-api-key'
        }
      }
    ],
    domain: { id: 'orders', name: 'Orders', version: '0.0.1' }
  }
]
```

The headers are passed with every HTTP request when fetching the OpenAPI file from the specified URL.

### Define EventCatalog ids and names in your OpenAPI specification file

<AddedIn version="3.0.0" pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

EventCatalog messages (commands, queries and events) have two important properties, these are `id` and `name`.

- id - The id of your message (used for url slugs)
- name - Friendly name for your message in EventCatalog (used in the UI)

The OpenAPI generator will set a default value for the `name` and `id` using the operationId or the service name.

If you want more control, you can use the `x-eventcatalog-message-name` and `x-eventcatalog-message-id` extensions to specify the `id` and `name` value.

```yml title="x-eventcatalog-message-type example"
paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      tags:
        - pets
      x-eventcatalog-message-type: query # command,  query, or event
      x-eventcatalog-message-id: list-pets # Used as EventCatalog ID (slug) and reference to the resource
      x-eventcatalog-message-name: List pets # Used by EventCatalog as friendly name for the message
      parameters:
        - name: limit
          in: query
          description: How many items to return at one time (max 100)
          required: false
          schema:
            type: integer
            maximum: 100
            format: int32
```

### Define messages a service sends or receives

<AddedIn version="2.3.0" pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

**By default all messages in your OpenAPI spec file are documented as messages that are received by your service** (e.g a route with /getOrders will be a query/command/event that the service accepts).

If you want to specify the relationship of your messages and services (sends or receives) you can do this using the custom extension `x-eventcatalog-message-action`. Which you can define in your OpenAPI files.

```yml title="x-eventcatalog-message-action example"
paths:
  /pets/{petId}/vaccinated:
      post:
        summary: Notify that a pet has been vaccinated
        operationId: petVaccinated
        tags:
          - pets
        # This tells eventcatalog that this message is sent from this service.  
        x-eventcatalog-message-action: sends 
        requestBody:
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Vaccination'
          required: true
        responses:
          '200':
            description: Notification that the pet has been vaccinated successfully
          default:
            description: unexpected error
            content:
              application/json:
                schema:
                  $ref: '#/components/schemas/Error'
```

In the example above, when the generator runs, it will put the message `petVaccinated` as a message the petstore service sends.

### Adding prefix to all messages

<AddedIn version="7.4.1" pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

If you want more control over the ids of the generated messages you can

1. [Define ids nad names using the `x-eventcatalog-message-id` and `x-eventcatalog-message-name` extensions](#define-eventcatalog-ids-and-names-in-your-openapi-specification-file).
2. Add a prefix to the id of the generated messages (see below)

<Tabs>
  <TabItem value="prefix (with a string)">

This will add a prefix to the id of the generated messages. For example a message with the operationId `getOrders` with a configured prefix of `hello-` will be `hello-getOrders`.

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-openapi',
      {
        messages: { id: { prefix: 'hello' } },
      },
  ],
],
```
</TabItem>
  <TabItem value="prefix (with custom separator)">

This will add a prefix to the id of the generated messages. For example a message with the operationId `getOrders` with a configured prefix of `hello-` and separator of `_` will be `hello_getOrders`.

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-openapi',
      { 
        messages: { id: { prefix: 'hello', separator: '_' } },
      },
  ],
],
```
</TabItem>
  <TabItem value="prefix (with service id)">

This will add the service id to the id of the generated messages. For example a message with the operationId `getOrders` and the service id `orders-service` will be `orders-service-getOrders`.

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-openapi',
      { 
        messages: { id: { prefixWithServiceId: true } },
      },
  ],
],
```
</TabItem>
</Tabs>


### Deprecating messages

<AddedIn version="5.0.4" pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

To mark messages as deprecated you can use the `deprecated` field or the `x-eventcatalog-deprecated-date` and `x-eventcatalog-deprecated-message` extensions.

**Deprecated as a boolean**

[OpenAPI natively supports deprecating](https://swagger.io/specification/) messages using the `deprecated` field.

```yml title="Deprecated as a boolean"
paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      deprecated: true
```

When this deprecated field is set to `true`, the message will be rendered in EventCatalog with a banner indicating that the message is deprecated.

![Deprecated message](../../development/guides/img/deprecated/is-deprecated.png)

**Deprecated as an object**

If you want more fine grained control over the deprecation date and message, you can use the `x-eventcatalog-deprecated-date` and `x-eventcatalog-deprecated-message` extensions.

```yml title="Deprecated as an object"
paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      x-eventcatalog-deprecated-date: 2026-05-01
      x-eventcatalog-deprecated-message: |
        This message is **being deprecated** and replaced by the new service **InventoryService**.
        Please contact the [team for more information](mailto:inventory-team@example.com) or visit our [website](https://eventcatalog.dev).
```
This will render a banner in EventCatalog indicating that the message will be deprecated on 2026-05-01.

![Deprecated message](../../development/guides/img/deprecated/will-be-deprecated.png)

### Persist markdown

When you generate your OpenAPI files your markdown on your domains,services, and messages in EventCatalog is persisted between versions.

This allows you to add [custom components](/docs/custom-components), our [MDX components](/docs/components) and customize your EventCatalog pages without losing changes when you version your OpenAPI files.

### Automatic versioning

When you change versions in your OpenAPI file and run generate, your services and messages are automatically versioned. This allows you to keep an audit log of changes between OpenAPI files, schemas and more.

You can also add changelogs between different versions of your services and messages. [Read here for more information](/docs/development/guides/messages/common/changelog).

### Downloading schemas

If your messages have schemas EventCatalog will document these for you. Run your generator and every message will show it's schema on the UI and give users the ability to download it's schema.

The service that is also generated will allow you to see and download the OpenAPI file.

### Group messages

<AddedIn version="7.12.0" pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

When a service sends or receives many messages, the [visualiser](/docs/development/guides/messages/common/grouping-messages) can become crowded. The `groupMessagesBy` option lets you automatically group related messages together so they collapse into a single node in the visualiser map, making your architecture easier to understand at a glance.

![Message group expanded in the visualiser](./img/message-group-expanded.png)

To learn more about how groups work in the visualiser, see [Grouping messages](/docs/development/guides/messages/common/grouping-messages).

Three strategies are supported:

| Strategy | How the group is determined |
|----------|----------------------------|
| `x-extension` | Reads the `x-eventcatalog-group` field on each OpenAPI operation |
| `path-prefix` | Derives the group from the first meaningful URL path segment, skipping common prefixes like `api`, `v1`, `v2` |
| `single-group` | Places every operation into a single group called `operations` |

#### Use the x-extension strategy

Set `groupMessagesBy: 'x-extension'` and add `x-eventcatalog-group` to each operation you want to group.

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-openapi',
    {
      services: [{ path: './openapi.yml', id: 'my-service' }],
      groupMessagesBy: 'x-extension',
    },
  ],
],
```

```yaml title="openapi.yml"
paths:
  /pets/{petId}/adopt:
    post:
      x-eventcatalog-group: Adoptions
      summary: Adopt a pet
      operationId: adoptPet
```

#### Use the path-prefix strategy

Set `groupMessagesBy: 'path-prefix'` and the generator derives the group name automatically from the URL. No changes to your OpenAPI file are needed.

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-openapi',
    {
      services: [{ path: './openapi.yml', id: 'my-service' }],
      groupMessagesBy: 'path-prefix',
    },
  ],
],
```

The generator reads the first meaningful path segment and capitalizes it as the group name. Common technical prefixes are skipped automatically.

| Path | Group |
|------|-------|
| `/pets/{petId}` | `Pets` |
| `/api/v1/billing/invoices` | `Billing` |
| `/health` | _(no group, single segment)_ |
| `/pets` | _(no group, single segment)_ |

#### Use the single-group strategy

Set `groupMessagesBy: 'single-group'` to place every operation into one group called `operations`, regardless of its path or any extensions. No changes to your OpenAPI file are needed.

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-openapi',
    {
      services: [{ path: './openapi.yml', id: 'my-service' }],
      groupMessagesBy: 'single-group',
    },
  ],
],
```

This is useful for very large APIs where `path-prefix` still leaves too many ungrouped nodes. Every message collapses into a single `operations` node in the visualiser.

:::tip
Once grouped, messages appear as a compact stacked card in the visualiser. Click the group to expand it and see the full downstream graph — channels, consumers, and producers — just as if the messages were ungrouped. See [Grouping messages](/docs/development/guides/messages/common/grouping-messages) for more details.
:::

---

### Parse examples from operations

<AddedIn version="7.9.0" pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

When `parseExamples` is enabled (the default), the generator reads examples defined on your OpenAPI operations and writes them as JSON files into each message's `examples` folder in EventCatalog.

Both request body examples and response examples are supported, across the single `example` and named `examples` formats from the OpenAPI specification.

**How examples are named**

| Source | File name |
|--------|-----------|
| Single request body `example` | `example.json` |
| Named request body `examples` (e.g. `dog`) | `dog.json` |
| Single response `example` (e.g. status `200`) | `response-200.json` |
| Named response `examples` (e.g. status `200`, name `dog`) | `response-200-dog.json` |

**OpenAPI example formats**

```yml title="Single request body example"
paths:
  /pets:
    post:
      operationId: createPet
      requestBody:
        content:
          application/json:
            example:
              name: Fido
              tag: dog
```

```yml title="Named request body examples"
paths:
  /pets:
    post:
      operationId: createPet
      requestBody:
        content:
          application/json:
            examples:
              dog:
                value:
                  name: Fido
                  tag: dog
              cat:
                value:
                  name: Whiskers
                  tag: cat
```

```yml title="Named response examples"
paths:
  /pets:
    post:
      operationId: createPet
      responses:
        '200':
          content:
            application/json:
              examples:
                dog:
                  value:
                    id: 1
                    name: Fido
                cat:
                  value:
                    id: 2
                    name: Whiskers
```

To disable example parsing, set `parseExamples: false` in your generator configuration.

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-openapi',
    {
      services: [
        { path: path.join(__dirname, 'openapi-files', 'orders-service.yml'), id: 'orders-service' }
      ],
      parseExamples: false,
    },
  ],
],
```

