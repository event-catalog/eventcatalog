---
sidebar_position: 1
keywords:
- EventCatalog Confluent Schema Registry
sidebar_label: Installation
title: Installation
description: Installation of the EventCatalog Confluent Schema Registry plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';
import Beta from '@site/src/components/MDX/Beta';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<PluginLicense url="#commercial-use" />

The Confluent Schema Registry plugin is used to generate a catalog from a Confluent Schema Registry and import your schemas into EventCatalog.

You can map your schemas from your Confluent Schema Registry to commands, events in your catalog, and assign these to services and domains.

## Installation

Run the command below to install the EventCatalog Confluent Schema Registry plugin.

:::tip "Don't have an EventCatalog project yet?"
If you don't have an EventCatalog project yet, you can follow the instructions in the [Getting Started](/docs/development/getting-started/installation) guide.
:::

<Tabs>
  <TabItem value="apple" label="Install on existing catalog" default>
    ```bash
npm i @eventcatalog/generator-confluent-schema-registry
```
  </TabItem>
  <TabItem value="orange" label="Create new catalog with Confluent Schema Registry plugin">
     ```bash
npx @eventcatalog/create-eventcatalog@latest my-catalog --template confluent-schema-registry
```
  </TabItem>
</Tabs>

## Configuration

To use the plugin you need to configure it in your `eventcatalog.config.js` file.

Add the plugin to the `generators` array.

<Tabs>
  <TabItem value="apple" label="Import all schemas" default>

  In this example we import all schemas from a Confluent Schema Registry.

  You can also create topics, and assign schemas to producers/consumers and domains. [(see examples)](/docs/plugins/confluent-schema-registry/plugin-configuration#example-configurations).


  
    ```js title="eventcatalog.config.js"
    // ...
    generators: [
      // 1. Import all schemas from a Confluent Schema Registry
      [
        '@eventcatalog/generator-confluent-schema-registry',
        {
          // The URL of your Confluent Schema Registry
          schemaRegistryUrl: 'http://localhost:8081',
          // Do you want to include all versions of a schema? (default: false)
          includeAllVersions: true
        },
      ],
    ];
    ```
  </TabItem>
  <TabItem value="orange" label="Import schemas, assign them to topics, services and domains">

In this example we document topics from kafka, assign schemas to them, and schemas to producers/consumers (services).
We create two domains, the `retail-domain` and the `communications-domain`.

:::info "Why do we configure the plugin twice?"
The generator can be configured as many times as you want.
In this example we configure the plugin twice, the first time we import and create the `retail-domain` and the second time we assign the schemas to the `communications-domain`.
:::

```js title="eventcatalog.config.js"
// ...
 [
  '@eventcatalog/generator-confluent-schema-registry',
      {
        // The URL of your Confluent Schema Registry
        schemaRegistryUrl: 'http://localhost:8081',
        // The topics (channels) to assign schemas to (optional)
        topics: [{
          id: 'orders-topic',
          name: 'Orders Topic',
          address: 'kafka-cluster-bootstrap:9092',
        }, {
          id: 'inventory-topic',
          name: 'Inventory Topic',
          address: 'kafka-cluster-bootstrap:9092',
        }],
        // The producers and consumers (services) to assign schemas to (optional)
        services: [
          {
            id: 'Orders Service',
            version: '1.0.0',
            // the messages this service sends, this example sends events with a prefix of 'order-' to the 'orders-topic'
            sends: [{ events: { prefix: 'order-' }, topic: 'orders-topic' }],
            // the messages this service receives, this example receives events with a prefix of 'analytics-' from the 'inventory-topic'
            receives: [{ events: { prefix: 'analytics-' }, topic: 'inventory-topic' }],
          },
          {
            id: 'Inventory Service',
            version: '1.0.0',
            // the messages this service sends, this example sends events with a prefix of 'inventory-' to the 'inventory-topic'
            sends: [{ events: { prefix: 'inventory-' }, topic: 'inventory-topic' }],
            // the messages this service receives, this example receives events with a prefix of 'order-' from the 'orders-topic'
            receives: [{ events: { prefix: 'order-' }, topic: 'orders-topic' }],
          },
        ],
        domain: {
          id: 'retail-domain',
          name: 'Retail Domain',
          version: '1.0.0',
        }
      },
    ],
  [
    '@eventcatalog/generator-confluent-schema-registry',
      {
        // The URL of your Confluent Schema Registry
        schemaRegistryUrl: 'http://localhost:8081',
        // The topics (channels) to assign schemas to (optional)
        topics: [{
          id: 'users-topic',
          name: 'Users Topic',
          address: 'kafka-cluster-bootstrap:9092',
        }, {
          id: 'shipments-topic',
          name: 'Shipments Topic',
          address: 'kafka-cluster-bootstrap:9092',
        }],
        // The producers and consumers (services) to assign schemas to (optional)
        services: [
          {
            id: 'Notifications Service',
            version: '1.0.0',
            receives: [
              // the messages this service receives, this example receives events with a prefix of 'user-registered' from the 'users-topic'
              { events: ['user-registered'], topic: 'users-topic' },
              // the messages this service receives, this example receives events with a prefix of 'shipment-created' from the 'shipments-topic'
              { events: ['shipment-created'], topic: 'shipments-topic' },
              // the messages this service receives, this example receives events with a prefix of 'payment-received' from the 'payments-topic'
              { events: ['payment-received'] }
            ],
          },
        ],
        domain: {
          id: 'communications-domain',
          name: 'Communications Domain',
          version: '1.0.0',
        }
      },
  ],
```  
  </TabItem>
</Tabs>

### Configure API keys

The EventCatalog Confluent Schema Registry plugin requires API keys in your environment variables.

1. An EventCatalog Scale license key for the Confluent Schema Registry plugin (30-day trial, at [EventCatalog Cloud](https://eventcatalog.cloud))
2. Confluent Schema Registry API keys (found in the [Confluent Cloud](https://confluent.cloud) console)

Create a `.env` file in the root, and add your keys to the project.

```bash title=".env"
# EventCatalog license key
EVENTCATALOG_SCALE_LICENSE_KEY=your-scale-license-key

# Confluent Schema Registry API Keys
CONFLUENT_SCHEMA_REGISTRY_KEY=your-confluent-schema-registry-key
CONFLUENT_SCHEMA_REGISTRY_SECRET=your-confluent-schema-registry-key-secret
```

:::tip Using an Older API Key?

If you already have an older Confluent Schema Registry plugin key, you can still use it with the plugin-specific environment variable.

```bash title=".env"
EVENTCATALOG_LICENSE_KEY_CONFLUENT_SCHEMA_REGISTRY=your-license-key
```

:::

#### White listing EventCatalog domains

If you are behind a firewall you will need to white list the domain `https://api.eventcatalog.cloud` in your firewall. This is because the plugin needs to verify your license key.

#### Run the plugin

Run the plugin to import your schemas into EventCatalog.

_This command will run the generators in your eventcatalog.config.js file._

```
npm run generate
```

#### View your catalog

Run your catalog locally to see the changes

```
npm run dev
```

#### Build your catalog for production

```
npm run build
```



## Any questions or need help?

If you get stuck, find an issue or need help, please raise an issue on [GitHub](https://github.com/event-catalog/eventcatalog/issues) or join our [Discord community](https://eventcatalog.dev/discord).

You can also find some examples of the plugin in action in our examples repository: [eventcatalog/examples](https://github.com/event-catalog/generators/tree/main/examples/generator-confluent-schema-registry).

