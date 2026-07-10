---
sidebar_position: 2
keywords:
- installation
sidebar_label: Installation
title: Installation
description: How to install the AWS Glue Schema Registry plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<PluginLicense url="#commercial-use" />

## Installation

Install the plugin into your EventCatalog application:

:::tip "Don't have an EventCatalog project yet?"
If you don't have an EventCatalog project yet, you can follow the instructions in the [Getting Started](/docs/development/getting-started/installation) guide.
:::


```bash
npm install @eventcatalog/generator-aws-glue
```

## Configuration

Add the generator to your `eventcatalog.config.js` file:

<Tabs>
  <TabItem value="apple" label="Import all schemas" default>

  ---

  In this example we import all schemas from an AWS Glue Schema Registry.

  We don't map them to any services or domains.

  ```js title="eventcatalog.config.js"
  // ...
generators: [
    // Import all schemas into your catalog
    [
      '@eventcatalog/generator-aws-glue',
      {
        // The region of your AWS Glue Schema Registry
        region: 'us-east-1',
        // The name of your AWS Glue Schema Registry
        registryName: 'my-glue-registry'
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
      // The name of your AWS Glue Schema Registry
      registryName: 'my-glue-registry',
      // Creating producers and consumers, and mapping them to your catalog
      services: [
        
        // We map schemas to the orders service
        // Using the prefix and suffix we can map specific schemas to the service
        { id: 'Orders Service', version: '1.0.0', sends: [{ prefix: 'Order' }, { suffix: 'Placed' }], receives:[{ prefix: 'Inventory' }, { suffix: 'Adjusted' }] },

        // Map schemas to the Inventory Service
        // Filter by prefix (all schemas that match the prefix get assigned). This example shows any schema matching the prefix
        // "myapp.orders" will be assigned to the inventory service. The inventory service will publish these schemas.
        { id: 'Inventory Service', version: '1.0.0', sends: [{ prefix: "myapp.orders"}], receives:[{ prefix: "UserCheckedOut"}] },


        // This service sends schemas that match the SchemaName prefixing myapp, and will receive schemas that end with Payment
        // this also does not map any schemas to your schemas
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
    '@eventcatalog/generator-aws-glue',
    {
      // The region of your AWS Glue Schema Registry
      region: 'us-east-1',
      // The name of your AWS Glue Schema Registry
      registryName: 'my-glue-registry',
      // Creating producers and consumers, and mapping them to your catalog
      services: [
        // We map schemas to the orders service
        // Using the prefix and suffix we can map specific schemas to the service
        { id: 'Orders Service', version: '1.0.0', sends: [{ prefix: 'Order' }, { suffix: 'Placed' }], receives:[{ prefix: 'Inventory' }, { suffix: 'Adjusted' }] },
      ],

      // all services are mapped to this domain
      domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
    },
  ],
  [
    '@eventcatalog/generator-aws-glue',
    {
      region: 'us-east-1',
      registryName: 'my-glue-registry',
      services: [
        // Create the inventory service and map schemas to it (producer/consumer relationship)
        { id: 'Inventory Service', version: '1.0.0', sends: [{ prefix: "myapp.orders"}], receives:[{ prefix: "UserCheckedOut"}] },
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

The EventCatalog AWS Glue Schema Registry plugin requires an EventCatalog Scale license key to work with EventCatalog.

You can get a trial Scale license key from [EventCatalog Cloud](https://eventcatalog.cloud).

You have a few options for setting the license key:

1. [Setting license key in `.env` file (recommended)](#setting-license-key-in-env-file-recommended)
2. [Setting license key in eventcatalog.config.js](#setting-license-key-in-eventcatalogconfigjs)

#### 1. Setting license key in `.env` file (recommended) {#setting-license-key-in-env-file-recommended}

Create a `.env` file in the root of your project and add the following:

```bash title=".env"
EVENTCATALOG_SCALE_LICENSE_KEY=your-scale-license-key
```

:::tip Using an Older API Key?

If you already have an older AWS Glue Schema Registry plugin key, you can still use it with the plugin-specific environment variable.

```bash title=".env"
EVENTCATALOG_LICENSE_KEY_AWS_GLUE_SCHEMA_REGISTRY=your-license-key
```

:::

#### 2. Setting license key in eventcatalog.config.js {#setting-license-key-in-eventcatalogconfigjs}

If you prefer, you can set the license key in the `eventcatalog.config.js` file
using the `licenseKey` property in the EventCatalog AWS Glue Schema Registry plugin.

```js title="eventcatalog.config.js"
export default {
  generators: [
    [
      '@eventcatalog/generator-aws-glue',
      {
        licenseKey: '[INSERT_YOUR_LICENSE_KEY]', // or process.env.EVENTCATALOG_SCALE_LICENSE_KEY
      },
    ],
  ],
};
```

#### White listing EventCatalog domains

If you are behind a firewall you will need to white list the domain `https://api.eventcatalog.cloud` in your firewall. This is because the plugin needs to verify your license key.

## Required AWS Permissions

The plugin requires the following AWS IAM permissions to access your Glue Schema Registry:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "glue:ListSchemas",
        "glue:GetSchema",
        "glue:GetSchemaVersion",
        "glue:GetTags"
      ],
      "Resource": [
        "arn:aws:glue:*:*:registry/*",
        "arn:aws:glue:*:*:schema/*/*"
      ]
    }
  ]
}
```

## AWS Credential Configuration

The plugin uses the AWS SDK for JavaScript and supports all standard AWS credential methods:

### Environment Variables
```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1
```

### AWS CLI Profile
```bash
aws configure --profile eventcatalog
export AWS_PROFILE=eventcatalog
```

### Custom Credentials
You can also provide credentials directly in the configuration:

```js
// eventcatalog.config.js
module.exports = {
  generators: [
    [
      '@eventcatalog/generator-aws-glue',
      {
        region: 'us-east-1',
        registryName: 'my-event-registry',
        credentials: {
          accessKeyId: 'your-access-key',
          secretAccessKey: 'your-secret-key',
        },
      },
    ],
  ],
}
```

:::warning
Never commit credentials to your repository. Use environment variables or AWS credential files instead.
:::

## Cross-Account Access

To access registries in different AWS accounts, use the `registryArn` parameter:

```js
// eventcatalog.config.js
module.exports = {
  generators: [
    [
      '@eventcatalog/generator-aws-glue',
      {
        region: 'us-east-1',
        registryArn: 'arn:aws:glue:us-east-1:123456789012:registry/cross-account-registry',
      },
    ],
  ],
}
```

## Running the Generator

Once configured, generate your catalog:

```bash
npm run generate
```

This will connect to your AWS Glue Schema Registry and generate EventCatalog documentation for all your schemas.
