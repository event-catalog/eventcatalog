---
sidebar_position: 3
keywords:
- components
sidebar_label: Features
title: Features
description: Features of AsyncAPI with EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';



### Using filters to map events to your services

EventCatalog plugin supports a range of filters:

- `suffix` - Matches anything at the end of the schema name
- `preffix` - Matches anything at the start of the schema name
- `detailType` - Exact matching on the detail type of the event
- `source` - Exact matching on the source of the events

You can use the filters to map events directly to your services, this gives you flexibility on how you want to structure your EventCatalog and map events to services.

:::tip
Filters are mapped on the registry schema name. If you are using schema-discovery this will be the `source@detailType` (e.g `myapp.test.com@OrderCreated`). 
If you are using a custom registry this will be the schema name you defined for that event.
:::

**suffix example**

In this example any event in the registry that ends with `Orders` or `Inventory` will get mapped into EventCatalog. 
These events will map into the Orders Service.

```js
generators: [
    [
      '@eventcatalog/generator-eventbridge',
      {
        region: 'us-east-1',
        registryName: 'discovered-schemas',
        services: [
          { id: 'Orders Service', version: '1.0.0', sends: [{ suffix: ['Orders'] }], receives:[{ suffix: "Inventory"}] },
        ],
        domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
      },
    ],
  ],

```

**prefix example**

In this example all events in the registry that starts with `myapp.orders.test@Orders` or `myapp.orders.test@Inventory` will get mapped into EventCatalog. 
In this example the Orders Service sends events that start with `myapp.orders.test@Orders` and receives events that start with `myapp.orders.test@Inventory`


```js
generators: [
    [
      '@eventcatalog/generator-eventbridge',
      {
        region: 'us-east-1',
        registryName: 'discovered-schemas',
        services: [
          { id: 'Orders Service', version: '1.0.0', sends: [{ prefix: ['myapp.orders.test@Orders']}], receives:[{ prefix: "myapp.orders.test@Inventory"}] },
        ],
        domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
      },
    ],
  ],

```

**detailType example**

In this example all events that match the given detailType will get mapped into EventCatalog. 
```js
generators: [
    [
      '@eventcatalog/generator-eventbridge',
      {
        region: 'us-east-1',
        registryName: 'discovered-schemas',
        services: [
          { id: 'Orders Service', version: '1.0.0', sends: [{ detailType: 'OrderCreated'}], receives:[{ detailType: ["InventoryAdjusted", "InventoryOutOfStock"]}] },
        ],
        domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
      },
    ],
  ],

```

**source example**

In this example all events that match the given source will get mapped into EventCatalog. 

This example shows the Order Service will send all events that match the source `myapp.orders` and will receives all events that match the source `myapp.inventory` and `myapp.payments`.

```js
generators: [
    [
      '@eventcatalog/generator-eventbridge',
      {
        region: 'us-east-1',
        registryName: 'discovered-schemas',
        services: [
          { id: 'Orders Service', version: '1.0.0', sends: [{ source: 'myapp.orders'}], receives:[{ source: ["myapp.inventory", "myapp.payments"]}] },
        ],
        domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
      },
    ],
  ],

```

### Using custom schema registries

EventBridge offers users the ability to create custom schema registries. This let's you create and upload new schemas to EventBridge.

This generator will support these custom registries and map events to your services based on these registries.

The mapping works slightly different with custom registries. The event name is mapped as the `source`.

Here is an example of how this works:

- Custom registry name: `custom-schemas`
- Schema Name (the service sends this event): `OrderPlaced`
- Schema Name (the service receives this event): `InventoryAdjusted`
- Schema Name (the service receives this event): `InventoryAmountUpdated`

```yml
generators: [
    [
      '@eventcatalog/generator-eventbridge',
      {
        region: 'us-east-1',
        # This is the name of your custom registry
        registryName: 'custom-schemas',
        services: [
          # Map the name of the schema (event) into this service. 
          # In this example the Order Service will send an event called OrderPlaced and receive an event called InventoryAdjusted and InventoryAmountUpdated
          # Note: The source value is the name of the schema in the registry, this is how AWS names the schemas in your custom registry.
          { id: 'Orders Service', version: '1.0.0', sends: [{ source: 'OrderPlaced'}], receives:[{ source: ["InventoryAdjusted", "InventoryAmountUpdated"]}] },
        ],
        domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
      },
    ],
  ],
```

### Document Event Buses (as channels)

<AddedIn version="1.2.0" pkg="@eventcatalog/generator-eventbridge" url="https://github.com/event-catalog/generator-eventbridge/releases/tag/v"/>

EventCatalog [supports channels as resources](/docs/development/guides/resources/messages/message-channels/introduction). This let's you document your event buses in EventCatalog.

EventCatalog will use your Event Bus as a channel, the protocol for the channel is set to `eventbridge`.

This can help your developers understand and visually see that EventBridge events are published and consumed from Amazon EventBridge.

![Example](/img/integrations/eventbridge/eventbridge-channel.png)

The channel page will be populated with quick links to your AWS console.

![Example](/img/integrations/eventbridge/eventbridge-channel-doc.png)

#### Getting started

To document your eventbus you need to specify the `eventBusName` in your `sends` or `receives` array.

The example below shows a service that sends events from the `orders` event bus` and receives events from the `inventory` event bus.

```md
---
generators: [
    [
      '@eventcatalog/generator-eventbridge',
      {
        region: 'us-east-1',
        registryName: 'discovered-schemas',
        services: [
          # Define the service, and map events the service producers/consumes
          # EventBusName is used to map the producer/consumer events to an event bus
          { id: 'Orders Service', version: '1.0.0', sends: [{ source: 'myapp.orders', eventBusName: "orders"}], receives:[{ source: ["myapp.inventory", "myapp.payments"], "eventBusName"}] },
        ],
        domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
      },
    ],
  ],
---
```

### Persist markdown

Your markdown is persisted between generation runs on EventCatalog. Initially the generator will generate markdown for you for your domains, services and events, but any edits to the markdown file will be persisted between versions.

This allows you to add [custom components](/docs/components/custom-components), our [MDX components](/docs/components) and customize your EventCatalog pages without losing changes when your events are versioned.

This can be useful for adding extra additional context to your events, example payloads, example CLI commands on how to raise them and any other useful information.

### Automatic versioning

**Schema discovery**

If you are using the schema discovery feature, then Amazon EventBridge will version the schemas for you. They version your schema using a field called `VersionCount`. This value is used and mapped to your event version. When you re-generate your catalog using this generator it will check your event versions and automatcily version your events based on these fields.

How it works

- You put and event onto a bus with discovery enabled (v1 of this event is stored in registry by EventBridge)
- You run generate for your catalog (v1 is documented in your catalog)
- You change the payload of the original event and put another event on the bus (v2 is created by EventBridge.)
- You run generate for your catalog (v1 is versioned for you, and v2 takes it place).

**Custom registry**

You can create your own custom registry with Amazon EventBridge. This let's you create and upload new schemas.

Any version changes here will get copied over into EventCatalog.


### Downloading schemas

The generator will try and download the JSONDraft4 and OpenAPI specifications for your events from EventBridge. These files will be attached to each even in EventCatalog. Users will be able to see and download these files.
