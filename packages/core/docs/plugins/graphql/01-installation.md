---
sidebar_position: 1
keywords:
- EventCatalog GraphQL
sidebar_label: Installation
title: Installation
description: Installation of the EventCatalog GraphQL plugin
---

import PluginLicense from '@site/src/components/MDX/PluginLicense';
import Beta from '@site/src/components/MDX/Beta';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<PluginLicense url="#commercial-use" />

The GraphQL plugin is used to generate EventCatalog resources (e.g domains, services and messages) from your GraphQL schema files.

## Installation

Run the command below to install the EventCatalog GraphQL plugin.

<Tabs>
  <TabItem value="apple" label="Install on existing catalog" default>
    ```bash
npm i @eventcatalog/generator-graphql
```
  </TabItem>
</Tabs>

:::tip "Don't have an EventCatalog project yet?"
If you don't have an EventCatalog project yet, you can follow the instructions in the [Getting Started](/docs/development/getting-started/installation) guide.
:::

#### Configuration

Configure the plugin in your `eventcatalog.config.js` file.

Add the plugin to the `generators` array.

```js title="eventcatalog.config.js"
// ...
generators: [
  // Add single GraphQL schema to a domain
  [
    '@eventcatalog/generator-graphql',
    {
      services: [
        // Point to a local GraphQL schema file, we assign it to the service "User Service", the service has a version of 1.0.0
        { path: path.join(__dirname, 'graphql-schemas', 'user-service.graphql'), id: "User Service", version: "1.0.0"}
      ],
      // The services are assigned to the domain "Users"
      domain: { id: 'users', name: 'Users', version: '0.0.1' },
    },
  ],
  // Add many GraphQL schemas to a domain
  [
    '@eventcatalog/generator-graphql',
    {
      services: [
        // Orders service
        { path: path.join(__dirname, 'graphql-schemas', 'order-service.graphql'), id: "Order Service", version: "1.0.0"}
        // Payment service
        { path: path.join(__dirname, 'graphql-schemas', 'payment-service.graphql'), id: "Payment Service", version: "1.0.0"}
      ],
      // We add the orders and payment services to the domain "Shopping"
      domain: { id: 'shopping', name: 'Shopping', version: '0.0.1' },
    },
  ],
],
};

```

### Configure license key

The EventCatalog GraphQL plugin requires a license key to work with EventCatalog.

You can get a trial license key from [EventCatalog Cloud](https://eventcatalog.cloud).

You have a few options for setting the license key:

1. [Setting license key in `.env` file (recommended)](#setting-license-key-in-env-file-recommended)
2. [Setting license key in eventcatalog.config.js](#setting-license-key-in-eventcatalogconfigjs)

#### 1. Setting license key in `.env` file (recommended)

Create a `.env` file in the root of your project and add the following:

```bash title=".env"
EVENTCATALOG_LICENSE_KEY_GRAPHQL=your-license-key
```

:::tip Using an older version of EventCatalog?

If you are using an older version of EventCatalog that does not support the `.env` file, you can just export the license key as an environment variable.

```bash title="Setting license key in environment variables"
export EVENTCATALOG_LICENSE_KEY_GRAPHQL=your-license-key
```

:::

#### 2. Setting license key in eventcatalog.config.js

If you prefer, you can set the license key in the `eventcatalog.config.js` file
using the `licenseKey` property in the EventCatalog GraphQL plugin.

```js title="eventcatalog.config.js"
export default {
  generators: [
    [
      '@eventcatalog/generator-graphql',
      {
        licenseKey: '[INSERT_YOUR_LICENSE_KEY]', // or process.env.EVENTCATALOG_LICENSE_KEY_GRAPHQL
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

## Any questions or need help?

If you get stuck, find an issue or need help, please raise an issue on [GitHub](https://github.com/event-catalog/eventcatalog/issues) or join our [Discord community](https://eventcatalog.dev/discord).