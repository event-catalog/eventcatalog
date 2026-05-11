---
sidebar_position: 1
keywords:
- EventCatalog AsyncAPI plugin
sidebar_label: Plugin Configuration
title: Plugin Configuration
description: Configuration of the EventCatalog AsyncAPI plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Plugin Configuration

## Overview

The EventCatalog AsyncAPI plugin is configured in the `eventcatalog.config.js` file inside the `generators` array.

## Required Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `services` | `Service[]` | Yes | List of AsyncAPI files to add to your catalog |
| `licenseKey` | string | Yes* | License key for the plugin. Get a 14-day trial at [EventCatalog Cloud](https://eventcatalog.cloud). Can also be set via `EVENTCATALOG_LICENSE_KEY_ASYNCAPI` environment variable. |

### Service Configuration

Each service in the `services` array requires the following properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | EventCatalog ID for the service. |
| `path` | string | Yes | Path to your AsyncAPI file or remote URL to the AsyncAPI file |
| `name` | string | No | Display name for the service. If not provided, the specification will be used. _Added in v4.5.3_|
| `summary` | string | No | Short summary of the service. If not provided, the specification will be used. _Added in v4.5.3_|
| `owners` | string[] | No | Owners of the service. You can assign EventCatalog users or teams to services. Setting owners on the service will also set the owners of the messages in the AsyncAPI file. If owners are already set on any resource, those owners are persisted. |
| `generateMarkdown` | function | - | Function to override the default markdown generation for the service. See [Markdown templates](#markdown-templates) for more information. |
| `writesTo` | array[\{id: string, version?: string\}] | No | Array of [data stores](/docs/development/guides/data/introduction) id and version (optional) that the service writes to. (Added in v4.5.4) |
| `readsFrom` | array[\{id: string, version?: string\}] | No | Array of [data stores](/docs/development/guides/data/introduction) id and version (optional) that the service reads from. (Added in v4.5.4) |
| `headers` | `Record<string, string>` | No | HTTP headers for authenticated remote URLs (e.g., `{ Authorization: 'Bearer token' }`). Used when fetching AsyncAPI files from URLs that require authentication. |

## Optional Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `domain` | object | - | Domain to associate all configured services with |
| `domain.id` | string | - | Domain identifier |
| `domain.name` | string | - | Domain display name |
| `domain.version` | string | - | Domain version |
| `domain.owners` | string[] | - | Owners of the domain. If owners are already set on the domain, those owners are persisted. |
| `domain.generateMarkdown` | function | - | Function to override the default markdown generation for the domain. See [Markdown templates](#markdown-templates) for more information. |
| `messages.generateMarkdown` | function | - | Function to override the default markdown generation for the message. See [Markdown templates](#markdown-templates) for more information. |
| `messages.id` | object | - | Configure the id of the messages that are generated (for example, set a prefix to all messages that are generated) _(Added in v4.5.1)_ [(Read more)](/docs/plugins/asyncapi/features#adding-prefix-to-all-messages) |
| `messages.id.prefix` | string | - | A prefix value for the message that is generated. For example a message with the id `orderPlaced` with a configured prefix of `hello-` will be `hello-orderPlaced`. _(Added in v4.5.1)_ [(Read more)](/docs/plugins/asyncapi/plugin-configuration#adding-prefix-to-all-messages) |
| `messages.id.separator` | string | `-` | The separator to use between the prefix and the message id. _(Added in v4.5.1)_ [(Read more)](/docs/plugins/asyncapi/plugin-configuration#adding-prefix-to-all-messages) |
| `messages.id.prefixWithServiceId` | boolean | | If true, the service id will be added to the id of the messages that are generated. For example a message with the id `orderPlaced` and the service id `orders-service` will be `orders-service-orderPlaced`. _(Added in v4.5.1)_ [(Read more)](/docs/plugins/asyncapi/plugin-configuration#adding-prefix-to-all-messages) |
| `messages.id.lowerCase` | boolean | false | If true, the message id will be stored in lowercase and the folder will also be lowercased. (e.g `/events/orderplaced/index.mdx) _(Added in v5.0.0)_ |
| `saveParsedSpecFile` | boolean | `false` | Parse and save expanded AsyncAPI spec (helpful for files with $refs) |
| `parseSchemas` | boolean | `true` | If you choose to parse your specification file using the [saveParsedSpecFile](#saveparsedspecfile-saveparsedspecfile) field, you can also opt in or out to have your ,message schemas parsed using the `parseSchemas` field. By default message schemas are parsed, if you want to keep your original schemas you have to set `parseSchemas` to false. | | `parseChannels` | boolean | `false` | Parse and save channels. If you set to true the AsyncAPI channels will also be documented in the catalog. |
| `parseChannels` | boolean | `false` | When setting the value to true the generator will parse and write channels to your EventCatalog. |
| `writeFilesToRoot` | boolean | `false` | Write AsyncAPI messages to root instead of service folder. By default all domains, services and messages will be grouped in the folder directory structure. |
| `saveParsedSpecFile` | boolean | `true` | By default your AsyncAPI file will render in your catalog as you define it. If you are using $refs, or having issues seeing your AsyncAPI file in your catalog, then you can set this value to true. `saveParsedSpecFile`  is false by default. |
| `attachHeadersToSchema` | boolean | `false` | When enabled, combines message headers and payload into a single schema with `headers` and `payload` properties. Only applies to messages using JSON schema format. _(Added in v5.5.1)_ [(Read more)](/docs/plugins/asyncapi/features#attach-headers-to-schema) |
| `parseExamples` | boolean | `true` | Parse message examples from AsyncAPI files and write each payload as a `.json` file to the message's `examples` folder. Named examples use `{name}.json`; unnamed examples fall back to `example-{index}.json`. Set to `false` to disable. _(Added in v6.1.0)_ [(Read more)](/docs/plugins/asyncapi/features#parse-message-examples) |
| `debug` | boolean | `false` | Enable debug mode |

## Example Configuration

```js title="eventcatalog.config.js"
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** @type {import('@eventcatalog/core/bin/eventcatalog.config').Config} */
export default {
  cId: "10b46030-5736-4600-8254-421c3ed56e47",
  title: "MetaRetail Inc",
  tagline: "Fake Retail Company for EventCatalog Demo",
  organizationName: "MetaRetail Inc",
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
    text: "MetaRetail Inc",
  },
  docs: {
    sidebar: {
      // Should the sub heading be rendered in the docs sidebar?
      showPageHeadings: true,
    },
  },
  generators: [
    [
      '@eventcatalog/generator-asyncapi',
      {
        services: [
          { path: path.join(__dirname, 'asyncapi-files', 'orders-service.yml'), id: 'Orders Service' },
          { path: path.join(__dirname, 'asyncapi-files', 'order-fulfillment-service.yml'), id: 'Order Fulfillment' },
          { path: path.join(__dirname, 'asyncapi-files', 'inventory-service.yml'), id: 'Inventory Service' },
        ],
        domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
      },
    ],
    [
      '@eventcatalog/generator-asyncapi',
      {
        services: [
          // Add AsyncAPI file by public URL
          { path: "https://raw.githubusercontent.com/event-catalog/eventcatalog-asyncapi-example/refs/heads/main/asyncapi-files/payment-service.yml", id: "Payment Service"},
          // Add AsyncAPI file by file system
          { path: path.join(__dirname, 'asyncapi-files', 'fraud-detection-service.yml'), id: 'Fraud Detection' },
        ],
        domain: { id: 'payment', name: 'Payment', version: '0.0.1' },
      },
    ],
    [
      '@eventcatalog/generator-asyncapi',
      {
        services: [
          { path: path.join(__dirname, 'asyncapi-files', 'user-service.yml'), id: 'User Service' },
        ],
        domain: { id: 'user-domain', name: 'User Domain', version: '0.0.1' },
        debug: true
      },
    ],
  ],
};
```

You can view an example configuration in the [EventCatalog AsyncAPI plugin GitHub repository](https://github.com/event-catalog/generators/blob/main/examples/generator-asyncapi/basic/eventcatalog.config.js).

## Markdown templates

<AddedIn version="4.3.0" pkg="@eventcatalog/generator-asyncapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

The EventCatalog AsyncAPI plugin will generate default markdown for each domain, service and message.

If you want more control, you can override these using your own **markdown templates**.

To use your own markdown templates you need to provide a function that returns the markdown for the domain, service or message.

Below you can see examples of how to override the default markdown for the domain, service and message.

<Tabs>
  <TabItem value="Domain Markdown Template">

  #### Domain

  In this example we will override the default markdown for the domain using our custom function. We will also preserve the default markdown for the domain.

```js title="eventcatalog.config.js"
// function to generate the markdown for the domain
// You can include this in your config file or in a separate file and import it
const generateMarkdownForDomain = ({ domain, markdown }) => {
  return `# ${domain.name}
    This is the default markdown for the domain

    You can add anything you want here, including components, tables, etc.

    ## Architecture Diagram
    <NodeGraph />

    // Add the default markdown for the domain if you want to preserve it
    ${markdown}
  `;
}

// Your configuration
export default {
  generators: [
    [
      '@eventcatalog/generator-asyncapi',
      {
        // ...rest of generator config
        domain: {
          id: 'orders',
          name: 'Orders',
          version: '0.0.1',
          generateMarkdown: generateMarkdownForDomain
        }
      }
    ]
  ]
}
```

**Function Arguments:**

| Argument | Type | Properties | Description |
|----------|------|----------|-------------|
| `domain` | object | `id`, `name`, `version` | The domain object you provided in the config |
| `markdown` | string | - | The default markdown for the domain. Incase you want to preserve the default markdown you can use this argument to add to your own markdown. |


  </TabItem>
  <TabItem value="Service Markdown Template">

  #### Service

  In this example we will override the default markdown for the service using our custom function. We will also preserve the default markdown for the service.

  ```js title="eventcatalog.config.js"
  // function to generate the markdown for the service
  // You can include this in your config file or in a separate file and import it
  const generateMarkdownForService = ({ service, markdown, document }) => {
    return `# ${service.name}
      This is the default markdown for the service

      ## Description
      ${document.info.description ? `${document.info.description}` : ''}  
    `;
  }

  // Your configuration
  export default {
    generators: [
      [
        '@eventcatalog/generator-asyncapi',
        {
          // ...rest of generator config
          service: {
            id: 'orders-service',
            name: 'Orders Service',
            version: '0.0.1',
            generateMarkdown: generateMarkdownForService
          }
        }
      ]
    ]
  }
  ```

  **Function Arguments:**

  | Argument | Type | Properties | Description |
  |----------|------|----------|-------------|
  | `service` | object | `id`, `name`, `version` | The service object you provided in the config |
  | `markdown` | string | - | The default markdown for the service. Incase you want to preserve the default markdown you can use this argument to add to your own markdown. |
  | `document` | object | AsyncAPI.Document | The AsyncAPI document object. |


  </TabItem>
  <TabItem value="Message Markdown Template">

  #### Message

  In this example we will override the default markdown for the message using our custom function. We will also preserve the default markdown for the message.

  ```js title="eventcatalog.config.js"
  // function to generate the markdown for the message
  // You can include this in your config file or in a separate file and import it
  const generateMarkdownForMessage = ({ message, markdown, document }) => {
    return `# ${message.name}
      This is the default markdown for the message
    `;
  }

  // Your configuration
  export default {
    generators: [
      [
        '@eventcatalog/generator-asyncapi',
        {
          // ...rest of generator config
          messages: {
            generateMarkdown: generateMarkdownForMessage
          }
        }
      ]
    ]
  }
  ```

  **Function Arguments:**

  | Argument | Type | Properties | Description |
  |----------|------|----------|-------------|
  | `document` | object | AsyncAPI.Message | The AsyncAPI message object. |
  | `document` | object | AsyncAPI.Document | The AsyncAPI document object. |
  | `markdown` | string | - | The default markdown for the message. Incase you want to preserve the default markdown you can use this argument to add to your own markdown. |

  </TabItem>
</Tabs>


## Need help?

If you have questions or need help, you can join our [Discord community](https://eventcatalog.dev/discord)
or refer to the [AsyncAPI examples on GitHub](https://github.com/event-catalog/generators/tree/main/examples/generator-asyncapi).














