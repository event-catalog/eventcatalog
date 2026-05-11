---
sidebar_position: 5
keywords:
  - components
sidebar_label: Generator configuration
title: Generator API
description: Getting started with Amazon EventBridge plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';

## Overview {#overview}

API for the EventCatalog Amazon EventBridge generator.

**Example eventcatalog.config.js file**

```js title="eventcatalog.config.js"
---
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** @type {import('@eventcatalog/core/bin/eventcatalog.config').Config} */
export default {
  title: 'OurLogix',
  tagline: 'A comprehensive logistics and shipping management company',
  organizationName: 'OurLogix',
  homepageLink: 'https://eventcatalog.dev/',
  landingPage: '',
  editUrl: 'https://github.com/boyney123/eventcatalog-demo/edit/master',
  trailingSlash: false,
  base: '/',
  logo: {
    alt: 'EventCatalog Logo',
    src: '/logo.png',
    text: 'OurLogix',
  },
  docs: {
    sidebar: {
      showPageHeadings: true,
    },
  },
  generators: [
    [
      '@eventcatalog/generator-eventbridge',
      {
        region: 'us-east-1',
        registryName: 'discovered-schemas',
        services: [
          // Maps exact events to the service
          { id: 'Orders Service', version: '1.0.0', sends: [{ detailType: ['OrderPlaced', 'OrderUpdated'], eventBusName: 'orders'}], receives:[{ detailType: "InventoryAdjusted"}, eventBusName: 'inventory'] },

          // Filter by source (all events that match the source get assigned). This example shows any event matching the source
          // "myapp.orders" will be assigned to the inventory service. The inventory service will publish these events.
          { id: 'Inventory Service', version: '1.0.0', sends: [{ source: "myapp.orders"}], receives:[{ detailType: "UserCheckedOut"}] },


          // This service sends events that match the SchemaName prefixing myapp, and will receive events that end with Payment
          { id: 'Payment Service', version: '1.0.0', sends: [{ prefix: "myapp"}], receives:[{ suffix: "Payment" }] }
        ],

        // all services are mapped to this domain
        domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
      },
    ],
    // Just import all events into the Catalog from a registry
    [
      '@eventcatalog/generator-eventbridge',
      {
        region: 'us-east-1',
        registryName: 'discovered-schemas'
      },
    ],
    // Example using optional credentials
    [
      '@eventcatalog/generator-eventbridge',
      {
        region: 'us-east-1',
        registryName: 'discovered-schemas',
        credentials: {
          accessKeyId: 'X',
          secretAccessKey: 'X',
          accountId: 'X',
        },
      },
    ],
  ],
};

```

:::warning
When importing node modules into your `eventcatalog.config.js` file, you need to import the entire package.

```js
import path from "path"; //work

import { join } from "path"; // will not work
```

This is currently a limitation and is being looked at. Any problems or issues feel free to raise a GitHub issue.

:::

## Required fields {#required-fields}

### `region` {#region}

- Type: `String`

The region of your schema registry.

```js title="eventcatalog.config.js"
[
  '@eventcatalog/generator-eventbridge',
  {
    region: 'us-east-1',
    registryName: 'discovered-schemas'
  },
],
```

### `registryName` {#registryName}

- Type: `String`

The EventBridge registry name for your schemas.

```js title="eventcatalog.config.js"
[
  '@eventcatalog/generator-eventbridge',
  {
    region: 'us-east-1',
    registryName: 'discovered-schemas'
  },
],
```

### `licenseKey` {#licenseKey}

- Type: `String`

The license key for the EventBridge generator. You can get a 14 day trial license key to try the plugin out by going to [EventCatalog Cloud](https://eventcatalog.cloud).

```js title="eventcatalog.config.js"
[
  '@eventcatalog/generator-eventbridge',
  {
    licenseKey: 'YOUR_LICENSE_KEY'
  },
],
```

:::info Using environment variables

You can also set the license key as an environment variable. If this is set on the machine the `licenseKey` is not required in the generator configuration.

```bash
EVENTCATALOG_LICENSE_KEY_EVENTBRIDGE=YOUR_LICENSE_KEY
```
:::

## Optional fields {#optional-fields}

### `services` {#services}

- Type: `Service[]`

List of services to add and what events they publish (sends) and consume (receives)

```js title="eventcatalog.config.js"
[
   '@eventcatalog/generator-eventbridge',
    {
      region: 'us-east-1',
      registryName: 'discovered-schemas',
      services: [
        // Maps exact events to the service
        { id: 'Orders Service', version: '1.0.0', sends: [{ detailType: ['OrderPlaced', 'OrderUpdated'], receives:[{ detailType: "InventoryAdjusted"}]}] },

        // Filter by source (all events that match the source get assigned). This example shows any event matching the source
        // "myapp.orders" will be assigned to the inventory service. The inventory service will publish these events.
        { id: 'Inventory Service', version: '1.0.0', sends: [{ source: "myapp.orders"}], receives:[{ detailType: "UserCheckedOut"}] },


        // This service sends events that match the SchemaName prefixing myapp, and will receive events that end with Payment
        { id: 'Payment Service', version: '1.0.0', sends: [{ prefix: "myapp"}], receives:[{ suffix: "Payment" }] }
      ]
  },
];
```

**Service properties**

| Property name | Required | Description                                                                   |
| ------------- | -------- | ----------------------------------------------------------------------------- |
| id            | required | Id of the service, this will also be used as the folder name of your service. |
| version            | required | The version of the service |
| sends            | optional | The events the service sends (publishes). You can use [EventCatalog filters](/docs/plugins/eventbridge/intro#using-filters-to-map-events-to-your-services) to match your events. |
| sends.eventBusName            | optional | The name of the EventBus for the matched events. This will be displayed as an EventCatalog Channel. |
| receives            | optional | The events the service receives (consumes). You can use [EventCatalog filters](/docs/plugins/eventbridge/intro#using-filters-to-map-events-to-your-services) to match your events. |
| receives.eventBusName            | optional | The name of the EventBus for the matched events. This will be displayed as an EventCatalog Channel. |
| writesTo            | optional | Array of [data stores](/docs/development/guides/data/introduction) ids that the service writes to. (Added in v3.2.2) |
| readsFrom            | optional | Array of [data stores](/docs/development/guides/data/introduction) ids that the service reads from. (Added in v3.2.2) |
| writeToRoot            | optional | Write the service to the root of your catalog, ignoring the domain structure. [Useful if you have shared services between domains](/docs/plugins/eventbridge/03a-workflows#shared-services-between-domains) (Added in v3.3.0) |

### `domain` {#domain}

The domain you want the services be associated with in your catalog.

```js title="eventcatalog.config.js"
[
  '@eventcatalog/generator-eventbridge',
  {
    region: 'us-east-1',
    registryName: 'discovered-schemas',
    services: [
      { id: 'Payment Service', version: '1.0.0', sends: [{ prefix: "myapp"}], receives:[{ suffix: "Payment" }] }
    ],
    domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
  },
];
```

**Service properties**

| Property name | Required | Description                                                                   |
| ------------- | -------- | ----------------------------------------------------------------------------- |
| id            | required | Id of the domain, this will also be used as the folder name of your domain. |
| version       | required | The version of the domain |
| name          | optional | Friendly name for your domain. |

### `writeFilesToRoot` {#writeFilesToRoot}

<AddedIn version="2.0.0" pkg="@eventcatalog/generator-eventbridge" url="https://github.com/event-catalog/generators/releases/"/>

- Type: `Boolean`

By default your EventBridge events will be written to the service folder (if you define one). This helps keep related events together in your EventCatalog folder structure.

Example:

```
services/
  payment-service/
    index.mdx
    events/
      payment-created/
        index.mdx
      payment-updated/
        index.mdx
```

If you set `writeFilesToRoot` to true, your EventBridge events will be written to the root of your catalog (pre v2.0.0 behavior).

Example:

```
services/
  payment-service/
    index.mdx
events/
  payment-created/
    index.mdx
  payment-updated/
    index.mdx
```
### `writeEventsToRoot` {#writeEventsToRoot}

<AddedIn version="3.3.0" pkg="@eventcatalog/generator-eventbridge" url="https://github.com/event-catalog/generators/releases/"/>

- Type: `Boolean`

By default your EventBridge events will be written to the service folder (if you define one). 

Setting this to true will write your events to the root of your catalog, but keep your services and domains folder in the same structure you define.

This is useful if you have shared events between services, and you want to document them in a central place.

You can read more about this in the [Workflows](/docs/plugins/eventbridge/03a-workflows#storing-shared-events-in-your-catalog-for-producers-and-consumers) section.

Example:

```
services/
  payment-service/
    index.mdx
    events/
      payment-created/
        index.mdx
      payment-updated/
        index.mdx
```

If you set `writeEventsToRoot` to true, your EventBridge events will be written to the root of your catalog, but keep your services and domains folder in the same structure you define.

Example:

```
services/
  payment-service/
    index.mdx
events/
  payment-created/
    index.mdx
  payment-updated/
    index.mdx
```

### `credentials` {#credentials}

- Type: `AwsCredentialIdentity | AwsCredentialIdentityProvider`

AWS credentials to use for your plugin.

```js title="eventcatalog.config.js"
[
   '@eventcatalog/generator-eventbridge',
    {
      region: 'us-east-1',
      registryName: 'discovered-schemas',
      credentials: {
        accessKeyId: 'ACCESS_KEY',
        secretAccessKey: 'ACCESS_KEY',
        accountId: 'ACCOUNT_ID',
      },
      services: [
        { id: 'Payment Service', version: '1.0.0', sends: [{ prefix: "myapp"}], receives:[{ suffix: "Payment" }] }
      ]
  },
];
```

If you are using credentials you will want to create a user with limited permissions. [See the documentation to get started](/docs/plugins/eventbridge/intro#aws-configuration).

### `domain` {#domain}

The domain you want the services be associated with in your catalog.

```js title="eventcatalog.config.js"
[
  '@eventcatalog/generator-eventbridge',
  {
    region: 'us-east-1',
    registryName: 'discovered-schemas',
    services: [
      { id: 'Payment Service', version: '1.0.0', sends: [{ prefix: "myapp"}], receives:[{ suffix: "Payment" }] }
    ],
    domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
  },
];
```

### `eventBusName` {#eventBusName}

The name of the event bus the events belong too.

A EventCatalog badge is added to your events when they generate with the event bus name.

```js title="eventcatalog.config.js"
[
  '@eventcatalog/generator-eventbridge',
  {
    region: 'us-east-1',
    registryName: 'discovered-schemas',
    eventBusName: 'payment-bus',
    services: [
      { id: 'Payment Service', version: '1.0.0', sends: [{ prefix: "myapp"}], receives:[{ suffix: "Payment" }] }
    ],
    domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
  },
];
```

### `mapEventsBy` {#mapEventsBy}

<AddedIn version="1.0.0" pkg="@eventcatalog/generator-eventbridge" url="https://github.com/event-catalog/generators/releases/tag/v"/>

When events are mapped to EventCatalog they are mapped by `detailType` by default. 
This means a schema with the name `orders.app@OrderPlaced` would be mapped to EventCatalog as `OrderPlaced`.

You can override this by setting the `mapEventsBy` field in your generator configuration.

Setting `mapEventsBy` to `schema-name` will map the event to EventCatalog by it's schema name, in this example
it would map the event to `orders.app@OrderPlaced`.

```js title="eventcatalog.config.js"
[
  '@eventcatalog/generator-eventbridge',
  {
    region: 'us-east-1',
    registryName: 'discovered-schemas',
    eventBusName: 'payment-bus',
    services: [
      { id: 'Payment Service', version: '1.0.0', sends: [{ prefix: "myapp"}], receives:[{ suffix: "Payment" }] }
    ],
    domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
    // Will now map by the schema name itself
    mapEventsBy: 'schema-name'
  },
];
```

| Property name | Required | Options | Description                                                                   |
| ------------- | -------- | -----------| ----------------------------------------------------------------------------- |
| mapEventsBy            | optional (default 'detail-type') | `detail-type`, `schema-name` | Specify how you want events to map to EventCatalog from the EventBridge registry. By default the `detailType` is used of your event, setting the value to `schema-name` uses the schema name (source@detailType). |

### `format` {#format}

<AddedIn version="3.0.2" pkg="@eventcatalog/generator-eventbridge" url="https://github.com/event-catalog/generators/releases/tag/v"/>

The format specifies the format of the markdown files that are generated (`md` or `mdx`).

By default the generator will use `mdx` files which is recommended if you are using the latest version of EventCatalog.

:::warning
If you are using an older version of EventCatalog that does not support mdx files you can set the format to `md`.
:::

```js title="eventcatalog.config.js"
[
  '@eventcatalog/generator-eventbridge',
  {
    region: 'us-east-1',
    registryName: 'discovered-schemas',
    eventBusName: 'payment-bus',
    services: [
      { id: 'Payment Service', version: '1.0.0', sends: [{ prefix: "myapp"}], receives:[{ suffix: "Payment" }] }
    ],
    domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
    // Will write .md files instead of .mdx
    format: 'md'
  },
];
```

| Property name | Required | Options | Description                                                                   |
| ------------- | -------- | -----------| ----------------------------------------------------------------------------- |
| format            | optional (default 'mdx') | `md`, `mdx` | Specify the format of the markdown files that are generated. |