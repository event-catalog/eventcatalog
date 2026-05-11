---
sidebar_position: 1
keywords:
- EventCatalog Apicurio Registry
sidebar_label: Installation
title: Installation
description: Installation of the EventCatalog Apicurio Registry plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';
import Beta from '@site/src/components/MDX/Beta';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<PluginLicense url="#commercial-use" />

The Apicurio Registry plugin is used to generate a catalog from an Apicurio Registry and import your schemas and specifications into EventCatalog.

You can map your schemas from your Apicurio Registry to events, commands, or queries in your catalog, and assign these to services and domains.

## Installation

Run the command below to install the EventCatalog Apicurio Registry plugin.

:::tip "Don't have an EventCatalog project yet?"
If you don't have an EventCatalog project yet, you can follow the instructions in the [Getting Started](/docs/development/getting-started/installation) guide.
:::

```bash
npm i @eventcatalog/generator-apicurio
```

<!-- <Tabs>
  <TabItem value="apple" label="Install on existing catalog" default>
    
  </TabItem>
  <TabItem value="orange" label="Create new catalog with Apicurio Registry plugin">
     ```bash
npx @eventcatalog/create-eventcatalog@latest my-catalog --template apicurio
```
  </TabItem>
</Tabs> -->

## Configuration

To use the plugin you need to configure it in your `eventcatalog.config.js` file.

Add the plugin to the `generators` array.

<Tabs>
  <TabItem value="apple" label="Import all schemas" default>

  In this example we import all schemas from an Apicurio Registry into EventCatalog.

  You can also create services and assign schemas to them, along with domains. [(see examples)](/docs/plugins/apicurio/plugin-configuration#example-configurations).


    ```js title="eventcatalog.config.js"
    // ...
    generators: [
      // 1. Import all schemas from an Apicurio Registry
      [
        '@eventcatalog/generator-apicurio',
        {
          // The URL of your Apicurio Registry
          registryUrl: 'http://localhost:8080',
          // Do you want to include all versions of a schema? (default: false)
          includeAllVersions: true
        },
      ],
    ];
    ```
  </TabItem>
  <TabItem value="orange" label="Import schemas and assign them to services and domains">

In this example we document services, assign schemas to them, and organize everything within a domain.

We create an `orders` domain and an `Orders Service` that sends and receives messages.

```js title="eventcatalog.config.js"
// ...
 [
  '@eventcatalog/generator-apicurio',
      {
        // The URL of your Apicurio Registry
        registryUrl: 'http://localhost:8080',
        // The services to assign schemas to (optional)
        services: [
          {
            id: 'Orders Service',
            version: '1.0.0',
            // the messages this service sends
            // We use the prefix matching against the artifact name
            sends: [
              { events: { prefix: 'order-' } }
            ],
            // the messages this service receives
            // We use the exact matching against the artifact name
            receives: [
              { commands: ['place-order', 'cancel-order'] }
            ],
          },
        ],
        domain: {
          id: 'orders',
          name: 'Orders',
          version: '1.0.0',
        }
      },
    ],
```
  </TabItem>
</Tabs>

### Configure API keys

The EventCatalog Apicurio Registry plugin requires API keys in your environment variables.

1. A license key for the Apicurio Registry plugin (14 days trial, at [EventCatalog Cloud](https://eventcatalog.cloud))
2. Apicurio Registry access token (optional - only if your registry requires authentication)

Create a `.env` file in the root, and add your keys to the project.

```bash title=".env"
# EventCatalog license key
EVENTCATALOG_LICENSE_KEY_APICURIO_SCHEMA_REGISTRY=your-license-key

# Apicurio Registry Bearer Token (optional - only if your registry requires authentication)
APICURIO_ACCESS_TOKEN=your-access-token-here
```

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

You can also find some examples of the plugin in action in our examples repository: [eventcatalog/examples](https://github.com/event-catalog/generators/tree/main/examples/generator-apicurio).
