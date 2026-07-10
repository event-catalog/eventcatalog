---
sidebar_position: 1
keywords:
- EventCatalog AsyncAPI
sidebar_label: Installation
title: Installation
description: Installation of the EventCatalog AsyncAPI plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';
import Beta from '@site/src/components/MDX/Beta';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<PluginLicense url="#commercial-use" />

The AsyncAPI plugin is used to generate a catalog from an AsyncAPI specification files.

You can map your AsyncAPI files to commands, events and queries in your catalog, and assign these to services and domains.

## Installation

Run the command below to install the EventCatalog AsyncAPI plugin.

<Tabs>
  <TabItem value="apple" label="Install on existing catalog" default>
    ```bash
npm i @eventcatalog/generator-asyncapi
```
  </TabItem>
  <TabItem value="orange" label="Create new catalog with AsyncAPI plugin">
     ```bash
npx @eventcatalog/create-eventcatalog@latest my-catalog --template asyncapi
```
  </TabItem>
</Tabs>

#### Configuration

Configure the plugin in your `eventcatalog.config.js` file.

Add the plugin to the `generators` array.

```js title="eventcatalog.config.js"
// ...
generators: [
  // Add single AsyncAPI file to a domain
  [
    '@eventcatalog/generator-asyncapi',
    {
      services: [
        { path: path.join(__dirname, 'asyncapi-files', 'orders-service.yml'), id: "Orders Service"}
      ],
      domain: { id: 'orders', name: 'Orders', version: '0.0.1' },

      // Run in debug mode, for extra output, if your AsyncAPI fails to parse, it will tell you why
      debug: true
    },
  ],
  // Add many AsyncAPI files to a domain
  [
    '@eventcatalog/generator-asyncapi',
    {
      services: [
        // Add AsyncAPI file by URL
        { path: "https://raw.githubusercontent.com/event-catalog/eventcatalog-asyncapi-example/refs/heads/main/asyncapi-files/payment-service.yml", id: "Payment Service"}
        // Add AsyncAPI file using file system
        { path: path.join(__dirname, 'asyncapi-files', 'fraud-detection-service.yml'), "Fraud Service"}
      ],
      domain: { id: 'payment', name: 'Payment', version: '0.0.1' },
      // Run in debug mode, for extra output, if your AsyncAPI fails to parse, it will tell you why
      debug: true
    },
  ],
],
};

```

### Configure license key

The EventCatalog AsyncAPI plugin requires an EventCatalog Scale license key to work with EventCatalog.

You can get a trial Scale license key from [EventCatalog Cloud](https://eventcatalog.cloud).

You have a few options for setting the license key:

1. [Setting license key in `.env` file (recommended)](#setting-license-key-in-env-file-recommended)
2. [Setting license key in eventcatalog.config.js](#setting-license-key-in-eventcatalogconfigjs)

#### 1. Setting license key in `.env` file (recommended) {#setting-license-key-in-env-file-recommended}

<AddedIn version="2.35.4" />

Create a `.env` file in the root of your project and add the following:

```bash title=".env"
EVENTCATALOG_SCALE_LICENSE_KEY=your-scale-license-key
```

:::tip Using an Older API Key?

If you already have an older AsyncAPI plugin key, you can still use it with the AsyncAPI-specific environment variable.

```bash title=".env"
EVENTCATALOG_LICENSE_KEY_ASYNCAPI=your-license-key
```

:::

#### 2. Setting license key in eventcatalog.config.js {#setting-license-key-in-eventcatalogconfigjs}

If you prefer, you can set the license key in the `eventcatalog.config.js` file
using the `licenseKey` property in the EventCatalog AsyncAPI plugin.

```js title="eventcatalog.config.js"
export default {
  generators: [
    [
      '@eventcatalog/generator-asyncapi',
      {
        licenseKey: '[INSERT_YOUR_LICENSE_KEY]', // or process.env.EVENTCATALOG_SCALE_LICENSE_KEY
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


