---
sidebar_position: 1
keywords:
- components
sidebar_label: Features
title: Features
description: Features of AsyncAPI with EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<!-- Table -->
| Feature | Use cases |
|---------|-----------|
| [Mapping messages events, commands or queries](#mapping-messages-events-commands-or-queries) | AsyncAPI does not distinguish between commands, events and queries, everything is a message. Using the EventCatalog custom AsyncAPI [extension](https://www.asyncapi.com/docs/concepts/asyncapi-document/extending-specification) `x-eventcatalog-message-type` you can specify if your messages are events, command or queries. |
| [Defining message ownership roles](#defining-message-ownership-roles) | AsyncAPI specification files do not define who owns the message and it's contract. Your AsyncAPI file my define messages your service consumes and produces but that service may not be the service that owns it's contract. (e.g An order service that consumes a Payment event. The order service (AsyncAPI file) would specify it consumes the payment event, but it is not the owner of the contract or event). |
| [Defining message versions](#defining-message-versions) | In EventCatalog you can version your domains, services and all your messages. This can be useful as you can specify which version of a message your service produces or consumes. |
| [Mapping channels into EventCatalog](#mapping-channels-into-eventcatalog) | EventCatalog supports [Channels](/docs/development/guides/channels/introduction) ([see demo](https://demo.eventcatalog.dev/docs/channels/inventory.%7Benv%7D.events/1.0.0)). This let's you document how messages or organized and transported in your event-driven architecture. |
| [Creating draft domains, services and messages](#creating-draft-domains-services-and-messages) | You can create draft domains, services and messages in EventCatalog from your AsyncAPI files. This will be used to mark the resources as draft in EventCatalog. |
| [Persist markdown](#persist-markdown) | When you generate your AsyncAPI files your markdown on your domains,services, and messages in EventCatalog is persisted between versions. This allows you to add [custom components](/docs/custom-components), our [MDX components](/docs/components) and customize your EventCatalog pages without losing changes when you version your AsyncAPI files. |
| [Fetch AsyncAPI files by URL](#fetch-asyncapi-files-by-url) | You can use the `path` property of the generator to specify a path to your local file system or an external URL, or you can mix both of them. |
| [Authenticate remote URLs](#authenticate-remote-urls) | Use HTTP headers to access protected AsyncAPI files from authenticated URLs. |
| [Automatic versioning](#automatic-versioning) | When you change versions in your AsyncAPI file and run generate, your services and messages are automatically versioned. This allows you to keep an audit log of changes between AsyncAPI files, schemas and more. |
| [Downloading schemas](#downloading-schemas) | If your messages have schemas (e.g avro, json) EventCatalog will document these for you. Run your generator and every message will show it's schema on the UI and give users the ability to download it's schema. |
| [Attach headers to schema](#attach-headers-to-schema) | Combine message headers and payload into a single schema with `headers` and `payload` properties. Useful when header metadata is part of the message contract. |
| [Parse message examples](#parse-message-examples) | Automatically write message examples from your AsyncAPI file as `.json` files in the message's `examples` folder in EventCatalog. |
| [AsyncAPI 3.1.0 support](#asyncapi-310-support) | Use AsyncAPI specification files up to version 3.1.0 without any extra configuration. |
| [Group messages](#group-messages) | Group related messages together in the visualiser for easier navigation of large APIs. |

### Mapping messages events, commands or queries

AsyncAPI does not distinguish between commands, events and queries, everything is a message. 

Using the EventCatalog custom AsyncAPI [extension](https://www.asyncapi.com/docs/concepts/asyncapi-document/extending-specification) `x-eventcatalog-message-type` you can specify if your messages are events, command or queries.

You can use the `x-eventcatalog-message-type` to specify the type of message. 

By default everything parsed by EventCatalog is an event, unless you specify with the x-eventcatalog-message-type extension.

```js title="x-eventcatalog-message-type example"
components:
  messages:
    OrderCreated:
      description: 'Event triggered when an order is created'
      x-eventcatalog-message-type: event // event/query/command
```

You can see more [examples of the extension on the demo project](https://github.com/event-catalog/generators/tree/main/examples/generator-asyncapi/tree/main/asyncapi-files).

### Defining message ownership roles

<AddedIn version="2.4.0" pkg="@eventcatalog/generator-asyncapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

AsyncAPI specification files do not define who owns the message and it's contract. Your AsyncAPI file my define messages your service consumes and produces but that service may not be the service that owns it's contract. (e.g An order service that consumes a Payment event. The order service (AsyncAPI file) would specify it consumes the payment event, but it is not the owner of the contract or event).

By default when you integrate your AsyncAPI files into EventCatalog, EventCatalog will assume your service (AsyncAPI file) owns the messages and will document them this way.

If you want to define ownership of messages in your files you can use the `x-eventcatalog-role` extension in your AsyncAPI files. This let's you specify if your service is a provider (owner) or the message or just a consumer (client) of the message.

The available extension values are:

- `provider`: Generator will generate a new message considering the service is the owner of message contract (`default`).
- `client`: Generator will consider the message as a sent/received message in service but will NOT generate or modify the message in EventCatalog.

```js title="x-eventcatalog-role example"
components:
  messages:
    SendOrderConfirmation:
      description: 'Command received to ask for sending an Order confirmation notification'
      x-eventcatalog-role: client // Define the ownership. This example shows the service is a client of the message and does not own the message.
```

You can see more [examples of the extension on the demo project](https://github.com/event-catalog/generators/tree/main/examples/generator-asyncapi/tree/main/asyncapi-files).

AsyncAPI specification files do not define who owns the message and it's contract. Your AsyncAPI file my define messages your service consumes and produces but that service may not be the service that owns it's contract. (e.g An order service that consumes a Payment event. The order service (AsyncAPI file) would specify it consumes the payment event, but it is not the owner of the contract or event).

By default when you integrate your AsyncAPI files into EventCatalog, EventCatalog will assume your service (AsyncAPI file) owns the messages and will document them this way.

If you want to define ownership of messages in your files you can use the `x-eventcatalog-role` extension in your AsyncAPI files. This let's you specify if your service is a provider (owner) or the message or just a consumer (client) of the message.

The available extension values are:

- `provider`: Generator will generate a new message considering the service is the owner of message contract (`default`).
- `client`: Generator will consider the message as a sent/received message in service but will NOT generate or modify the message in EventCatalog.

```js title="x-eventcatalog-role example"
components:
  messages:
    SendOrderConfirmation:
      description: 'Command received to ask for sending an Order confirmation notification'
      x-eventcatalog-role: client // Define the ownership. This example shows the service is a client of the message and does not own the message.
```

You can see more [examples of the extension on the demo project](https://github.com/event-catalog/generators/tree/main/examples/generator-asyncapi/tree/main/asyncapi-files).

### Defining message versions

<AddedIn version="2.4.2" pkg="@eventcatalog/generator-asyncapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

In EventCatalog you can version your domains, services and all your messages. This can be useful as you can specify which version of a message your service produces or consumes.

Using the AsyncAPI generator by default the messages that are generated all use the AsyncAPI version.

In the example below the service `Account Service` will be documented using the version `1.0.0`. The `UserSignedUp` event will be documented as version `1.0.0` (taken from the AsyncAPI version).

```yaml
asyncapi: 3.0.0
info:
  title: Account Service
  # This version is uses for your service and all messages
  version: 1.0.0
  description: This service is in charge of processing user signups
  contact:
    name: Awesome Team
    url: https://example.com
    email: support@asyncapi.org
# rest of AsyncAPI file...
UserSignedUp:
  description: 'Sign up a user'
  x-eventcatalog-message-version: 2.0.0
  tags:
    - name: 'New'
      description: 'New event'
  payload:
    type: object
    properties:
      displayName:
        type: string
        description: Name of the user
      email:
        type: string
        format: email
        description: Email of the user    
```

#### Defining message versions

If you want to version your messages separate from the AsyncAPI file you can use the `x-eventcatalog-message-version` extension.

Using the `x-eventcatalog-message-version` extension you can specify individual message versions.

In the example below the service `Account Service` will be documented using the version `1.0.0`. The `UserSignedUp` event will be documented as version `2.0.0`.


```yaml
asyncapi: 3.0.0
info:
  title: Account Service
  # This version is uses for your service and all messages
  version: 1.0.0
  description: This service is in charge of processing user signups
  contact:
    name: Awesome Team
    url: https://example.com
    email: support@asyncapi.org
# rest of AsyncAPI file...
UserSignedUp:
  description: 'Sign up a user'
  # Here we set the version of this message to 2.0.0.
  x-eventcatalog-message-version: 2.0.0
  tags:
    - name: 'New'
      description: 'New event'
  payload:
    type: object
    properties:
      displayName:
        type: string
        description: Name of the user
      email:
        type: string
        format: email
        description: Email of the user
# rest of AsyncAPI file...
```

`x-eventcatalog-message-version` is optional per message, by default the AsyncAPI version will be used per message unless you specify the `x-eventcatalog-message-version` version.

### Mapping channels into EventCatalog

<AddedIn version="2.7.0" pkg="@eventcatalog/generator-asyncapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

EventCatalog supports [Channels](/docs/development/guides/channels/introduction) ([see demo](https://demo.eventcatalog.dev/docs/channels/inventory.%7Benv%7D.events/1.0.0)). This let's you document how messages or organized and transported in your event-driven architecture.

![Example](../../../docs/development/guides/img/channels/channels-example.png)

AsyncAPI also supports [documenting channels](https://www.asyncapi.com/docs/concepts/channel#main-content). These can be added using the `channels` object. ([see example](https://github.com/asyncapi/spec/blob/97ea47fc412c3c1b6259e897eb900c73a6141205/examples/streetlights-kafka-asyncapi.yml#L39)).

Channels can give your developers more insights into how messages are transported between services (e.g producers and consumers). Channels support dynamic naming, protocol definition and can be assigned to messages.

**Documenting channels is off by default** but you can turn this on using the `parseChannels` [flag in your generator](/docs/plugins/asyncapi/plugin-configuration).

When `parseChannels` is `true`, channels are associated with the service via `sends`/`receives` using `to`/`from` pointers rather than being added directly to messages. Channel pointers include the version only when `x-eventcatalog-channel-version` is explicitly set on the channel; otherwise they default to `"latest"`.

### Creating draft domains, services and messages

<AddedIn version="4.4.0" pkg="@eventcatalog/generator-asyncapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

You can create draft domains, services and messages in EventCatalog from your AsyncAPI files. 

![Draft resources](../img/draft-resource.png)

**Use case:**

- You want to create a service in EventCatalog that is not yet implemented or going through feedback/design phase.
- You want to introduce a new endpoint to your service, but warn users that it is not yet implemented or still in development or draft.
- You want to introduce a whole new domain, but warn users everything in the domain is still in development or draft.

**Getting started**

You have a few options to create draft resources from your specification files.

- `domain.draft` - If true, the domain will be drafted in EventCatalog with all it's services / messages.
- `service.draft` - If true, the service will be drafted in EventCatalog with all it's endpoints / messages.

You can also choose to use AsyncAPI extensions to create draft resources.

- `x-eventcatalog-draft` - If true, the resource will be drafted in EventCatalog (e.g service and messages).

<details>
  <summary>Example of creating draft resources through domains (configuration)</summary>

Setting the `draft` property to true will create a draft domain with all it's services and messages in EventCatalog.

```js title="eventcatalog.config.js"
// ..rest of file
generators: [
  [
    '@eventcatalog/generator-asyncapi',
    {
      domain: { id: 'orders', name: 'Orders', version: '0.0.1', draft: true },
      services: [
        { path: path.join(__dirname, 'asyncapi-files', 'orders-service.yml'), id: 'orders-service', draft: true },
      ],
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
    '@eventcatalog/generator-asyncapi',
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
  <summary>Example marking service as draft (AsyncAPI extension)</summary>

Setting the `x-eventcatalog-draft` extension to true will mark the service as draft in EventCatalog.

```yml title="x-eventcatalog-draft example"
asyncapi: 3.0.0
info:
  title: Orders Service
  version: 1.0.0
  # Here we mark the service as draft
  x-eventcatalog-draft: true
# rest of AsyncAPI file...
```

In this example the **Orders Service** and all it's messages will be marked as draft in EventCatalog.

</details>
<details>
  <summary>Example marking a message as draft (AsyncAPI extension)</summary>

Setting the `x-eventcatalog-draft` extension on each message will mark the message as draft in EventCatalog.

```yml title="x-eventcatalog-draft example"
asyncapi: 3.0.0
info:
  title: Account Service
  version: 1.0.0
  description: This service is in charge of processing user signups
channels:
  userSignedup:
    address: user/signedup
    messages:
      UserSignedUp:
        $ref: '#/components/messages/UserSignedUp'
operations:
  sendUserSignedup:
    action: send
    channel:
      $ref: '#/channels/userSignedup'
    messages:
      - $ref: '#/channels/userSignedup/messages/UserSignedUp'
components:
  messages:
    UserSignedUp:
      description: 'User signed up the application'
      x-eventcatalog-message-type: event
      # This will mark the message as draft in EventCatalog
      x-eventcatalog-draft: true
      tags:
        - name: 'New'
          description: 'New event'
      headers:
        type: object
        properties:
          ec-message-type:
            type: string
            default: event
            description: Type of message for EventCatalog
      payload:
        type: object
        properties:
          displayName:
            type: string
            description: Name of the user
          email:
            type: string
            format: email
            description: Email of the user
```

In this example we mark the message `UserSignedUp` as draft but the service is not marked as draft in EventCatalog.

This can be useful if you want to introduce a new message, but warn users that it is not yet implemented or still in development or draft.

</details>


#### Setting custom versions for channels

EventCatalog supports versioning of channels. By default the version of the channel documented is the AsyncAPI version (you specify in the info object).

If you want more flexibility and document your channels individually you can use the `x-eventcatalog-channel-version` extension.

**Example of a channel with custom version**

```yaml
info:
  title: Streetlights Kafka API
  # Global version of this service (used by default)
  version: 1.0.0
channels:
  lightingMeasured:
    address: 'smartylighting.streetlights.1.0.event.{streetlightId}.lighting.measured'
    bindings:
      kafka:
        topic: 'my-topic'
        partitions: 3
    title: 'Lighting Measured Channel'
    summary: 'Inform about environmental lighting conditions of a particular streetlight.'
    messages:
      lightMeasured:
        $ref: '#/components/messages/lightMeasured'
    description: The topic on which measured values may be produced and consumed.
    parameters:
      streetlightId:
        $ref: '#/components/parameters/streetlightId'
    # The version of the channel
    x-eventcatalog-channel-version: 2.0.0
# AsyncAPI file contents...
```

When `parseChannels` is set to true, running the generate command will document your channels and all messages that are assigned to that channel.

### Parsing $ref values and message schemas

<AddedIn version="2.5.1" pkg="@eventcatalog/generator-asyncapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

Your AsyncAPI file may have references to other files/schemas in it. When using this with EventCatalog it's recommended to use the [saveParsedSpecFile](/docs/plugins/asyncapi/plugin-configuration) field.

Setting this value to true, will parse your specification file and remove any $ref values, as EventCatalog cannot parse $ref values when hosted in the project.

When your AsyncAPI file is parsed, by default the schemas will also be parsed. If you want to keep them as they are you can also use the [parseSchemas](/docs/plugins/asyncapi/plugin-configuration) flag. Setting this to `false` will keep your schemas as they are.

### Attach headers to schema

<AddedIn version="5.5.1" pkg="@eventcatalog/generator-asyncapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

When a message defines both headers and a payload, you can combine them into a single schema using `attachHeadersToSchema`. The resulting schema wraps both under `headers` and `payload` properties.

This is useful when your consumers need to validate or inspect message headers alongside the payload, for example when Spring `__TypeId__` headers or routing metadata are part of the contract.

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-asyncapi',
    {
      services: [
        { path: path.join(__dirname, 'asyncapi-files', 'orders-service.yml'), id: 'orders-service' },
      ],
      attachHeadersToSchema: true,
    },
  ],
],
```

Given an AsyncAPI message with headers and a JSON schema payload, the generated `schema.json` will look like this:

```json title="schema.json (generated output)"
{
  "type": "object",
  "properties": {
    "headers": {
      "type": "object",
      "properties": {
        "__TypeId__": {
          "type": "string",
          "description": "Spring Type Id Header"
        }
      }
    },
    "payload": {
      "type": "object",
      "properties": {
        "orderId": {
          "type": "string"
        }
      }
    }
  }
}
```

This option only applies to messages using JSON schema format. Messages with non-JSON schema formats (e.g. Avro) are not affected. If a message has no headers, the payload schema is written unchanged.

### Parse message examples

<AddedIn version="6.1.0" pkg="@eventcatalog/generator-asyncapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

When `parseExamples` is enabled (the default), the generator reads any [examples](https://www.asyncapi.com/docs/reference/specification/v3.0.0#messageExampleObject) defined on your AsyncAPI messages and writes each payload to the message's `examples` folder in EventCatalog.

Named examples use `{name}.json` as the filename. Unnamed examples fall back to `example-{index}.json` (e.g. `example-0.json`).

```yaml title="AsyncAPI message with examples"
components:
  messages:
    OrderCreated:
      description: 'Triggered when an order is created'
      x-eventcatalog-message-type: event
      payload:
        type: object
        properties:
          orderId:
            type: string
          total:
            type: number
      examples:
        - name: basic-order
          payload:
            orderId: 'ord-123'
            total: 49.99
        - payload:
            orderId: 'ord-456'
            total: 0.00
```

Running the generator with the above file produces two example files for the `OrderCreated` message:

- `examples/basic-order.json` (named example)
- `examples/example-1.json` (unnamed, falls back to index)

To disable example parsing, set `parseExamples` to `false` in your generator configuration:

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-asyncapi',
    {
      services: [
        { path: path.join(__dirname, 'asyncapi-files', 'orders-service.yml'), id: 'orders-service' },
      ],
      parseExamples: false,
    },
  ],
],
```

### Adding prefix to all messages

<AddedIn version="4.5.1" pkg="@eventcatalog/generator-asyncapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

If you want more control over the ids of the generated messages you can add a prefix to the id of the generated messages.

<Tabs>
  <TabItem value="prefix (with a string)">

This will add a prefix to the id of the generated messages. For example a message with the id `orderPlaced` with a configured prefix of `hello-` will be `hello-orderPlaced`.

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-asyncapi',
      {
        messages: { id: { prefix: 'hello' } },
      },
  ],
],
```
</TabItem>
  <TabItem value="prefix (with custom separator)">

This will add a prefix to the id of the generated messages. For example a message with the id `orderPlaced` with a configured prefix of `hello-` and separator of `_` will be `hello_orderPlaced`.

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-asyncapi',
      { 
        messages: { id: { prefix: 'hello', separator: '_' } },
      },
  ],
],
```
</TabItem>
  <TabItem value="prefix (with service id)">

This will add the service id to the id of the generated messages. For example a message with the id `orderPlaced` and the service id `orders-service` will be `orders-service-orderPlaced`.

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-asyncapi',
      { 
        messages: { id: { prefixWithServiceId: true } },
      },
  ],
],
```
</TabItem>
</Tabs>

### Deprecating messages

<AddedIn version="4.0.3" pkg="@eventcatalog/generator-asyncapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

To mark messages as deprecated you can use the `x-eventcatalog-deprecated-date` and `x-eventcatalog-deprecated-message` extensions.

```yml title="Deprecating a message using x-eventcatalog-deprecated-date and x-eventcatalog-deprecated-message"
SignUpUser:
  description: 'Sign up a user'
  x-eventcatalog-message-type: command
  x-eventcatalog-message-version: 2.0.0
  # Date the message will be deprecated (YYYY-MM-DD)
  x-eventcatalog-deprecated-date: 2025-04-09
  # Message to show in the deprecation banner (optional)
  x-eventcatalog-deprecated-message: This operation is deprecated because it is not used in the codebase
  payload:
    type: object
    properties:
      displayName:
        type: string
        description: Name of the user
      email:
        type: string
        format: email
        description: Email of the user
```

This will render a banner in EventCatalog indicating that the message will be deprecated on 2026-05-01.

_Example of a deprecated resource in EventCatalog:_

![Deprecated message](../../development/guides/img/deprecated/will-be-deprecated.png)


### Persist markdown

When you generate your AsyncAPI files your markdown on your domains,services, and messages in EventCatalog is persisted between versions.

This allows you to add [custom components](/docs/custom-components), our [MDX components](/docs/components) and customize your EventCatalog pages without losing changes when you version your AsyncAPI files.

### Fetch AsyncAPI files by URL

<AddedIn version="2.3.0" pkg="@eventcatalog/generator-asyncapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

You can use the `path` property of the generator to specify a path to your local file system or an external URL, or you can mix both of them.

```js
[
    '@eventcatalog/generator-asyncapi',
    {
      services: [
        // Add AsyncAPI file by public URL
        { path: "https://raw.githubusercontent.com/event-catalog/eventcatalog-asyncapi-example/refs/heads/main/asyncapi-files/payment-service.yml", id: "Payment Service"},
        // Add AsyncAPI file using file system
        { path: path.join(__dirname, 'asyncapi-files', 'fraud-detection-service.yml'), "Fraud Service"}
      ],
      domain: { id: 'payment', name: 'Payment', version: '0.0.1' },

      // Run in debug mode, for extra output, if your AsyncAPI fails to parse, it will tell you why
      debug: true,

      // Parse and add channels to your eventcatalog from the AsyncAPI spec files
      parseChannels: true
    },
  ],
```

### Authenticate remote URLs

When fetching AsyncAPI files from authenticated URLs, provide HTTP headers using the `headers` property.

This is useful for accessing private specifications from internal registries, API gateways, or other protected endpoints.

```js
[
  '@eventcatalog/generator-asyncapi',
  {
    services: [
      {
        path: "https://api.example.com/specs/payment-service.asyncapi.yml",
        id: "Payment Service",
        headers: {
          Authorization: 'Bearer your-api-token',
          'X-Api-Key': 'your-api-key'
        }
      }
    ],
    domain: { id: 'payment', name: 'Payment', version: '0.0.1' }
  }
]
```

The headers are passed with every HTTP request when fetching the AsyncAPI file from the specified URL.

### Automatic versioning

When you change versions in your AsyncAPI file and run generate, your services and messages are automatically versioned. This allows you to keep an audit log of changes between AsyncAPI files, schemas and more.

You can also add changelogs between different versions of your services and messages. [Read here for more information](/docs/development/guides/messages/common/changelog).

### Downloading schemas

If your messages have schemas (e.g avro, json) EventCatalog will document these for you. Run your generator and every message will show it's schema on the UI and give users the ability to download it's schema.

The service that is also generated will allow you to see and download the AsyncAPI file.

### AsyncAPI 3.1.0 support

<AddedIn version="6.0.0" pkg="@eventcatalog/generator-asyncapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

The generator supports AsyncAPI specification files up to and including version 3.1.0. No extra configuration is needed; point the `path` property at your 3.1.0 file and the generator handles the rest.

### Group messages

<AddedIn version="6.4.0" pkg="@eventcatalog/generator-asyncapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

When a service sends or receives many messages, the [visualiser](/docs/development/guides/messages/common/grouping-messages) can become crowded. The `groupMessagesBy` option lets you automatically group related messages together so they collapse into a single node in the visualiser map, making your architecture easier to understand at a glance.

![Message group expanded in the visualiser](./img/message-group-expanded.png)

To learn more about how groups work in the visualiser, see [Grouping messages](/docs/development/guides/messages/common/grouping-messages).

Set `groupMessagesBy: 'x-extension'` in your generator config, then add `x-eventcatalog-group` to each message in your AsyncAPI components.

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-asyncapi',
    {
      services: [{ path: './asyncapi.yml', id: 'my-service' }],
      groupMessagesBy: 'x-extension',
    },
  ],
],
```

```yaml title="asyncapi.yml"
components:
  messages:
    ShipmentDispatched:
      x-eventcatalog-group: Shipping
      description: A shipment has been dispatched
```

When `parseChannels` is also enabled, group assignments and channel pointers are both preserved on the generated messages.

:::tip
Once grouped, messages appear as a compact stacked card in the visualiser. Click the group to expand it and see the full downstream graph — channels, consumers, and producers — just as if the messages were ungrouped. See [Grouping messages](/docs/development/guides/messages/common/grouping-messages) for more details.
:::

### Example

See the [eventcatalog-asyncapi-example](https://github.com/event-catalog/generators/tree/main/examples/generator-asyncapi) for a working example.