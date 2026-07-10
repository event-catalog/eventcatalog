---
sidebar_position: 1
keywords:
- components
sidebar_label: Installation
title: Installation
description: Installation instructions for the Amazon API Gateway plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<PluginLicense url="#commercial-use" />

This plugin requires the OpenAPI and Amazon API Gateway plugins to be installed.

<!-- <iframe width="100%" height="415" src="https://www.youtube.com/embed/MeBuwAflwM4?si=rhio4gjfDPau4eqB" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe> -->

---

## Installation

Run the command below to install the Amazon API Gateway generator.

:::tip "Don't have an EventCatalog project yet?"
If you don't have an EventCatalog project yet, you can follow the instructions in the [Getting Started](/docs/development/getting-started/installation) guide.
:::

<Tabs>
  <TabItem value="apple" label="Install on existing catalog" default>
    ```bash
npm i @eventcatalog/generator-amazon-apigateway
```
  </TabItem>
  <TabItem value="orange" label="Create new catalog with the Amazon API Gateway template">
     ```bash
npx @eventcatalog/create-eventcatalog@latest my-catalog --template amazon-apigateway
```
  </TabItem>
</Tabs>

## Configuration

In your `eventcatalog.config.js` file, add the API Gateway generator and OpenAPI plugin to the `generators` array.

```js title="eventcatalog.config.js"
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** @type {import('@eventcatalog/core/bin/eventcatalog.config').Config} */
export default {
  cId: "10b46030-5736-4600-8254-421c3ed56e47",
  title: "EventCatalog",
  tagline: "Discover, Explore and Document your Event Driven Architectures",
  organizationName: "Your Company",
  homepageLink: "https://eventcatalog.dev/",
  editUrl: "https://github.com/boyney123/eventcatalog-demo/edit/master",
  // By default set to false, add true to get urls ending in /
  trailingSlash: false,
  // Change to make the base url of the site different, by default https://{website}.com/docs,
  // changing to /company would be https://{website}.com/company/docs,
  base: "/",
  // Customize the logo, add your logo to public/ folder
  logo: {
    alt: "EventCatalog Logo",
    src: "/logo.png",
    text: "EventCatalog",
  },
  docs: {
    sidebar: {
      // Should the sub heading be rendered in the docs sidebar?
      showPageHeadings: true,
    },
  },
  generators: [
    [
      "@eventcatalog/generator-amazon-apigateway",
      {
        output: 'amazon-api-gateway-output',
        apis: [
          {
            // The name of the API we want to process
            name: 'EcommerceApi',
            // Assume it's deployed to us-east-1, change this if you deployed somewhere else
            region: 'us-east-1',
            // The API stage name
            stageName: 'prod',
            version: '2',
            // Optional routes, we can map routes to message types
            // give them descriptions and unique ids in eventcatalog
            routes: {
              'post /cart/checkout': {
                type: 'command',
                id: 'CheckoutCart',
                description: 'Request to checkout the cart',
              },
              'post /cart/clear': {
                type: 'command',
                id: 'ClearCart',
                description: 'Request to clear the cart',
              },
            }
          }
        ]
      },
    ],
    // This will process the output of the amazon api gateway generator
    // it will process the OpenAPI file and map it into a service and domain
    // All routes are mapped to messages.
    [
      "@eventcatalog/generator-openapi",
      {
        services: [
          { path: path.join(__dirname, "amazon-api-gateway-output", "EcommerceApi.json"), id: 'ecommerce-api', owners: ['full-stack'] },
        ]
      },
    ],
  ],
};
```

### Configure license key

The API Gateway and OpenAPI plugin both require a license key to work with EventCatalog.

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

If you already have older Amazon API Gateway and OpenAPI plugin keys, you can still use them with the plugin-specific environment variables.

```bash title=".env"
EVENTCATALOG_LICENSE_KEY_AMAZON_APIGATEWAY=your-license-key
EVENTCATALOG_LICENSE_KEY_OPENAPI=your-license-key
```

:::

#### 2. Setting license key in eventcatalog.config.js {#setting-license-key-in-eventcatalogconfigjs}

If you prefer, you can set the license key in the `eventcatalog.config.js` file
using the `licenseKey` property in both the API Gateway and OpenAPI plugin.

```js title="eventcatalog.config.js"
export default {
  generators: [
    [
      '@eventcatalog/generator-eventbridge',
      {
        licenseKey: '[INSERT_YOUR_LICENSE_KEY]', // or process.env.EVENTCATALOG_SCALE_LICENSE_KEY
      },
    ],
  ],
};
```

#### White listing EventCatalog domains

If you are behind a firewall you will need to white list the domain `https://api.eventcatalog.cloud` in your firewall. This is because the plugin needs to verify your license key.

## Run the generator

Once you have configured the plugin and license key you can run the generator.

```sh
npm run generate
```

## View your catalog

Run your catalog locally to see the changes.

```sh
npm run dev
```


