---
sidebar_position: 1
keywords:
- EventCatalog GitHub
sidebar_label: Installation
title: Installation
description: Installation of the EventCatalog GitHub plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PluginLicense from '@site/src/components/MDX/PluginLicense';
import Beta from '@site/src/components/MDX/Beta';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<PluginLicense url="#commercial-use" />

The GitHub plugin is used to pull and sync your schemas from your GitHub repository to EventCatalog, these can be public or private repositories.

You can map your schemas from your GitHub repository to commands, events and queries in your catalog, and assign these to services (producers and consumers) and domains.

## Installation

Run the command below to install the EventCatalog GitHub plugin.

:::tip "Don't have an EventCatalog project yet?"
If you don't have an EventCatalog project yet, you can follow the instructions in the [Getting Started](/docs/development/getting-started/installation) guide.
:::

<Tabs>
  <TabItem value="apple" label="Install on existing catalog" default>
    ```bash
npm i @eventcatalog/generator-github
```
  </TabItem>
  <TabItem value="orange" label="Create new catalog with GitHub plugin">
     ```bash
npx @eventcatalog/create-eventcatalog@latest my-catalog --template github
```
  </TabItem>
</Tabs>

## Configuration

To use the plugin you need to configure it in your `eventcatalog.config.js` file.

Add the plugin to the `generators` array.

<Tabs>
  <TabItem value="apple" label="Assign schemas to commands, events and queries" default>

  In this example we assign schemas to commands, events and queries in our catalog.

  We don't create any producers or consumers in this example.

  :::info "Why would I import schemas without assigning them to producers or consumers?"
  You may just want to import the schemas into EventCatalog (events, queries, commands) without assigning them to producers or consumers.
  You can assign them later to producers and consumers yourself in EventCatalog.
  :::

  
    ```js title="eventcatalog.config.js"
    // ...
    generators: [
      // 1. Import all schemas from a Confluent Schema Registry
      [
        '@eventcatalog/generator-github',
        {
          // The HTTP or SSH URL of your GitHub repository
          source: 'https://github.com/event-catalog/eventcatalog',
          // The branch to pull schemas from (default: main)
          branch: 'main',
          // The root path to your schemas
          path: 'some-folder/schemas',
          messages: [
            {
              // the id of the message, needed for eventcatalog
              id: 'place-order',
              // Optional name for your message (if not provided, the id will be used)
              name: 'Place Order',
              // Optional version for your message (if not provided, default version of 1 will be used)
              version: '2.1',
              // The path to the schema file (relative to the root path, some-folder/schemas/place-order.avro)
              schemaPath: 'place-order.avro',
              // The type of message, can be 'command', 'event' or 'query'
              type: 'command',
            },
            // just required fields, defaulting version and name
            {
              id: 'order-shipped',
              // The path to the schema file (relative to the root path, some-folder/schemas/order-shipped.avro)
              schemaPath: 'order-shipped.avro',
              type: 'event',
            },
          ]
        },
      ],
    ];
    ```
  </TabItem>
  <TabItem value="orange" label="Import schemas and assign them to producers and consumers (services)">

In this example we import schemas from a GitHub repository, and assign them to producers and consumers (services).
We also create a domain and assign our services to it. 

:::info Adding documentation to your schemas
This plugin will import and keep your schemas in sync with your producers and consumers.

You can still use EventCatalog to document your schemas, services and domains using markdown. The markdown is persisted between imports.
This let's you add semantic meaning to your schemas, and document them for your teams, whilst keeping your schemas in sync with your producers and consumers.
:::

In this example we:

- Create two services (producers and consumers)
  - `Orders Service`
    - Sends `place-order` command
    - Receives `order-shipped` event
  - `Inventory Service`
    - Sends `inventory-updated` event
    - Receives `order-placed` event
- Create a domain `Retail Domain`
  - Assign the services to the domain


```js title="eventcatalog.config.js"
// ...
 [
  '@eventcatalog/generator-github',
      {
        // The URL of your GitHub repository
        source: 'https://github.com/event-catalog/eventcatalog',
        // The branch to pull schemas from (default: main)
        branch: 'main',
        // The root path to your schemas
        path: 'some-folder/schemas',
        
        // The producers and consumers (services) to assign schemas to (optional)
        services: [
          {
            id: 'Orders Service',
            version: '1.0.0',
            // the messages this service sends
            sends: [{
              id: 'place-order',
              version: '2.1',
              // The path to the schema file (relative to the root path, some-folder/schemas/place-order.avro)
              schemaPath: 'place-order.avro',
              // The type of message, can be 'command', 'event' or 'query'
              type: 'command',
            }],
            // the messages this service receives
            receives: [{
              id: 'order-shipped',
              version: '1.0',
              // The path to the schema file (relative to the root path, some-folder/schemas/order-shipped.avro)
              schemaPath: 'order-shipped.avro',
              // The type of message, can be 'command', 'event' or 'query'
              type: 'event',
            }],
          },
          {
            id: 'Inventory Service',
            version: '1.0.0',
            // the messages this service sends
            sends: [{
              id: 'inventory-updated',
              version: '1.0',
              // The path to the schema file (relative to the root path, some-folder/schemas/inventory-updated.avro)
              schemaPath: 'inventory-updated.avro',
              // The type of message, can be 'command', 'event' or 'query'
              type: 'event',
            }],
            // the messages this service receives
            receives: [{
              id: 'order-placed',
              version: '1.0',
              // The path to the schema file (relative to the root path, some-folder/schemas/order-placed.avro)
              schemaPath: 'order-placed.avro',
              // The type of message, can be 'command', 'event' or 'query'
              type: 'event',
            }],
          },
        ],
        // We assign the services to a domain "Retail Domain" (optional)
        domain: {
          id: 'retail-domain',
          name: 'Retail Domain',
          version: '1.0.0',
        }
      },
    ]
```  
  </TabItem>
</Tabs>

### Configure API keys

The EventCatalog GitHub plugin requires API keys in your environment variables.

1. An EventCatalog Scale license key for the GitHub plugin (30-day trial, at [EventCatalog Cloud](https://eventcatalog.cloud))

Create a `.env` file in the root, and add your keys to the project.

```bash title=".env"
# EventCatalog license key
EVENTCATALOG_SCALE_LICENSE_KEY=your-scale-license-key
```

:::tip Using an Older API Key?

If you already have an older GitHub plugin key, you can still use it with the plugin-specific environment variable.

```bash title=".env"
EVENTCATALOG_LICENSE_KEY_GITHUB=your-license-key
```

:::

#### White listing EventCatalog domains

If you are behind a firewall you will need to white list the domain `https://api.eventcatalog.cloud` in your firewall. This is because the plugin needs to verify your license key.

### Private repository authentication

<AddedIn version="1.0.0" pkg="@eventcatalog/generator-github" url="https://github.com/event-catalog/generators/releases/tag/v"/>

The GitHub plugin supports authentication for private repositories using GitHub personal access tokens (PAT) or GitHub App installation tokens.

You can authenticate in two ways:

**Option 1: Environment variable (recommended)**

Set the `EVENTCATALOG_GITHUB_TOKEN` environment variable in your `.env` file.

```bash title=".env"
# EventCatalog license key
EVENTCATALOG_SCALE_LICENSE_KEY=your-scale-license-key

# GitHub token for private repository access
EVENTCATALOG_GITHUB_TOKEN=ghp_your_token_here
```

**Option 2: Configuration option**

Pass the token directly in your configuration file.

```js title="eventcatalog.config.js"
generators: [
  [
    '@eventcatalog/generator-github',
    {
      source: 'https://github.com/your-org/private-repo',
      path: 'schemas',
      token: process.env.MY_GITHUB_TOKEN,
      // ... rest of configuration
    },
  ],
];
```

:::tip Create a GitHub token
To create a personal access token, visit [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens). For private repositories, you need the `repo` scope.
:::

:::info Public repositories
For public repositories, authentication is not required. The plugin will work without any token configuration.
:::

### Running the plugin

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

You can also find some examples of the plugin in action in our examples repository: [eventcatalog/examples](https://github.com/event-catalog/generators/tree/main/examples/generator-github).
