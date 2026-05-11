---
sidebar_position: 2
keywords:
- components
sidebar_label: Installation
title:  Installation
description: Installation guide for the EventCatalog Amazon EventBridge plugin
id: installation
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<AddedIn version="2.6.0"/>

The EventBridge plugin is a generator that can be used to generate your EventCatalog from an EventBridge registry.

You can map your schemas to services, domains and messages. You can also map all events from your registry into your catalog.

## Installation

Run the following command to install the plugin.

:::tip "Don't have an EventCatalog project yet?"
If you don't have an EventCatalog project yet, you can follow the instructions in the [Getting Started](/docs/development/getting-started/installation) guide.
:::

<Tabs>
  <TabItem value="apple" label="Install on existing catalog" default>
    ```bash
npm i @eventcatalog/generator-eventbridge
```
  </TabItem>
  <TabItem value="orange" label="Create new catalog with the EventBridge template">
     ```bash
npx @eventcatalog/create-eventcatalog@latest my-catalog --template eventbridge
```
  </TabItem>
</Tabs>


#### Configuration

Configure the plugin in your `eventcatalog.config.js` file.

Add the plugin to the `generators` array.

<Tabs>
  <TabItem value="apple" label="Import all schemas" default>

  ---

  In this example we import all schemas from an EventBridge registry.

  We don't map them to any services or domains.

  ```js title="eventcatalog.config.js"
  // ...
generators: [
    // Import all schemas into your catalog
    [
      '@eventcatalog/generator-eventbridge',
      {
        // The region of your EventBridge registry
        region: 'us-east-1',
        // The name of your EventBridge registry
        registryName: 'discovered-schemas'
      },
    ],
],
// ...
```
  </TabItem>
  <TabItem value="orange" label="Map schemas to producers and consumers">

  ---

  In this example we map schemas to producers and consumers (services).

  Every time you run the plugin, it will check if the service already exists in your catalog.

  If the service already exists, it will not create a new one and just maintain the schema mappings.

  We create two services, the `orders` service and the `inventory` service.
  
  

```js title="eventcatalog.config.js"
// ...
generators: [
  [
    '@eventcatalog/generator-eventbridge',
    {
      // The region of your EventBridge registry
      region: 'us-east-1',
      // The name of your EventBridge registry
      registryName: 'discovered-schemas',
      // Creating producers and consumers, and mapping them to your catalog
      services: [
        
        // We map schemas to the orders service
        // Using the detailType we can map specific events to the service
        { id: 'Orders Service', version: '1.0.0', sends: [{ detailType: ['OrderPlaced', 'OrderUpdated'], eventBusName: 'orders'}], receives:[{ detailType: "InventoryAdjusted", eventBusName: 'inventory'}] },

        // Map events to the Inventory Service
        // Filter by source (all events that match the source get assigned). This example shows any event matching the source
        // "myapp.orders" will be assigned to the inventory service. The inventory service will publish these events.
        { id: 'Inventory Service', version: '1.0.0', sends: [{ source: "myapp.orders", eventBusName: 'orders'}], receives:[{ detailType: "UserCheckedOut", eventBusName: 'inventory'}] },


        // This service sends events that match the SchemaName prefixing myapp, and will receive events that end with Payment
        // this also does not map any event buses to your events
        { id: 'Payment Service', version: '1.0.0', sends: [{ prefix: "myapp"}], receives:[{ suffix: "Payment" }] }
      ],

      // all services are mapped to this domain
      domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
    },
  ],
],
// ...
```
  </TabItem>
  <TabItem value="orange2" label="Multiple domains, services and events">

  ---

  In this example we have two domains, `orders` and `inventory`.

  We map schemas to the orders and inventory services, and we assign these services to new domains.

  If the domain or service already exists in your catalog, the plugin will not create a new one and just maintain the schema mappings.

  :::info Why do we define the plugin twice?
  The plugin can be defined multiple times in your `eventcatalog.config.js` file.

  In this example we define the plugin twice, the first time we import the schemas and create the `orders` domain.

  The second time we map the inventory service to the `inventory` domain.
  :::

```js title="eventcatalog.config.js"
// ...
generators: [
  [
    '@eventcatalog/generator-eventbridge',
    {
      // The region of your EventBridge registry
      region: 'us-east-1',
      // The name of your EventBridge registry
      registryName: 'discovered-schemas',
      // Creating producers and consumers, and mapping them to your catalog
      services: [
        // We map schemas to the orders service
        // Using the detailType we can map specific events to the service
        { id: 'Orders Service', version: '1.0.0', sends: [{ detailType: ['OrderPlaced', 'OrderUpdated'], eventBusName: 'orders'}], receives:[{ detailType: "InventoryAdjusted", eventBusName: 'inventory'}] },
      ],

      // all services are mapped to this domain
      domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
    },
  ],
  [
    '@eventcatalog/generator-eventbridge',
    {
      region: 'us-east-1',
      registryName: 'discovered-schemas',
      services: [
        // Create the inventory service and map schemas to it (producer/consumer relationship)
        { id: 'Inventory Service', version: '1.0.0', sends: [{ source: "myapp.orders", eventBusName: 'orders'}], receives:[{ detailType: "UserCheckedOut", eventBusName: 'inventory'}] },
      ],

      // create the inventory domain and assign the inventory service to it
      domain: { id: 'inventory', name: 'Inventory', version: '0.0.1' },
    },
  ],
],
// ...
```
  </TabItem>
</Tabs>



### Configure license key

The EventBridge plugin requires a license key to work with EventCatalog.

You can get a 14 day trial license key to try the plugin out by going to [EventCatalog Cloud](https://eventcatalog.cloud).

You have a few options for setting the license key:

1. [Setting license key in `.env` file (recommended)](#1-setting-license-key-in-env-file-recommended)
2. [Setting license key in eventcatalog.config.js](#2-setting-license-key-in-eventcatalogconfigjs)

#### 1. Setting license key in `.env` file (recommended)

<AddedIn version="2.35.4" />

Create a `.env` file in the root of your project and add the following:

```bash title=".env"
EVENTCATALOG_LICENSE_KEY_EVENTBRIDGE=your-license-key
```

:::tip Using an older version of EventCatalog?

If you are using an older version of EventCatalog that does not support the `.env` file, you can just export the license key as an environment variable.

```bash title="Setting license key in environment variables"
export EVENTCATALOG_LICENSE_KEY_EVENTBRIDGE=your-license-key
```

:::


#### 2. Setting license key in eventcatalog.config.js

If you prefer, you can set the license key in the `eventcatalog.config.js` file
using the `licenseKey` property in the EventCatalog EventBridge plugin.

```js title="eventcatalog.config.js"
export default {
  generators: [
    [
      '@eventcatalog/generator-eventbridge',
      {
        licenseKey: '[INSERT_YOUR_LICENSE_KEY]', // or process.env.EVENTCATALOG_LICENSE_KEY_EVENTBRIDGE
        region: 'us-east-1',
        registryName: 'discovered-schemas'
      },
    ],
  ],
};
```

#### White listing EventCatalog domains

If you are behind a firewall you will need to white list the domain `https://api.eventcatalog.cloud` in your firewall. This is because the plugin needs to verify your license key.

#### Run the plugin

_This command will run the generators in your eventcatalog.config.js file._

```
npm run generate
```

#### View your catalog

Run your catalog locally to see the changes

```
npm run dev
```

### AWS Configuration

#### Policy for AWS

This plugin will require some read access to your Schema Registry and Versions.

It's recommended you create a new IAM user with the following policy.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "EventCatalog",
            "Effect": "Allow",
            "Action": [
                "schemas:ExportSchema",
                "schemas:SearchSchemas",
                "schemas:ListSchemas",
                "schemas:ListSchemaVersions",
                "schemas:DescribeSchema",
                "schemas:GetDiscoveredSchema"
            ],
            "Resource": "*"
        }
    ]
}
```


## Commercial and License

This plugin requires a license key to be used. 

You can get a 14 day trial license key to try the plugin out by going to [EventCatalog Cloud](https://eventcatalog.cloud).

After the trial you can purchase a license to continue using this plugin, we have different plans to suit your organization. 

See [pricing](/pricing) for more information.

_Have any questions? You can email us at `hello@eventcatalog.dev`._

## License FAQ

### What is the license key for?
The license key is required to use the OpenAPI plugin with EventCatalog. It helps support ongoing development and maintenance of the plugin and project.

### How do I get a license key?
You can obtain a license key by visiting [EventCatalog Cloud](https://eventcatalog.cloud). New users can start with a 14-day free trial.

### Terms
- **Trial Period**: 14 days free trial no credit card required
- **Support**: Discord community support (extra for priority support)

After your trial period ends, you can purchase a full license through [EventCatalog Cloud](https://eventcatalog.cloud) to continue using the plugin.

## Issues

If you have any problems or feature requests please feel free to raise them on GitHub. https://github.com/event-catalog/generators