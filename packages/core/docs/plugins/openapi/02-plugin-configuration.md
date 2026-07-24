---
sidebar_position: 1
keywords:
- EventCatalog OpenAPI
sidebar_label: Plugin Configuration
title: Plugin Configuration
description: Configuration of the EventCatalog OpenAPI plugin
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Plugin Configuration

## Overview

The EventCatalog OpenAPI plugin is configured in the `eventcatalog.config.js` file inside the `generators` array.

## Required Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `services` | `Service[]` | Yes | List of OpenAPI files to add to your catalog |
| `licenseKey` | string | Yes* | EventCatalog Scale license key. Get a 30-day trial at [EventCatalog Cloud](https://eventcatalog.cloud). Can also be set via the `EVENTCATALOG_SCALE_LICENSE_KEY` environment variable. |


### Service Configuration

Each service in the `services` array requires the following properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | EventCatalog ID for the service. |
| `path` | string or string[] | Yes | Path/s to your OpenAPI file or remote URL to the OpenAPI file. v6.0.0 introduced the ability to map multiple OpenAPI files to a single service. |
| `version` | string | No | Version for the generated EventCatalog service and messages. If not provided, the OpenAPI `info.version` is used. For a `path` array, the highest `info.version` is selected using semantic version ordering and all specifications are attached to that service version. |
| `name` | string | No | Display name for the service. If not provided, the specification will be used. _Added in v7.4.3_|
| `summary` | string | No | Short summary of the service. If not provided, the specification will be used. _Added in v7.4.3_|
| `owners` | string[] | No | Owners of the service. You can assign EventCatalog users or teams to services. |
| `setMessageOwnersToServiceOwners` | boolean | No | If true, the owners of the service will be set to the owners of the messages in the OpenAPI file (default is true). |
| `generateMarkdown` | function | - | Function to override the default markdown generation for the service. See [Markdown templates](#markdown-templates) for more information. |
| `draft` | boolean | No | If true, the service will be drafted in EventCatalog with all it's endpoints / messages. (Added in v7.3.0) |
| `writesTo` | array[\{id: string, version?: string\}] | No | Array of [data stores](/docs/development/guides/resources/data/introduction) id and version (optional) that the service writes to. (Added in v7.5.0) |
| `readsFrom` | array[\{id: string, version?: string\}] | No | Array of [data stores](/docs/development/guides/resources/data/introduction) id and version (optional) that the service reads from. (Added in v7.5.0) |
| `headers` | `Record<string, string>` | No | HTTP headers for authenticated remote URLs (e.g., `{ Authorization: 'Bearer token' }`). Used when fetching OpenAPI files from URLs that require authentication. |
| `consumers` | `ConsumerService[]` | No | Services that consume messages generated from this OpenAPI spec. Each entry requires an `id`, and supports an optional `version` and `routes` filter. See [consumer services](/docs/plugins/openapi/features#define-consumer-services) for details. |

## Optional Configuration Options



| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `domain` | object | - | Domain to associate all configured services with |
| `domain.id` | string | - | Domain identifier |
| `domain.name` | string | - | Domain display name |
| `domain.version` | string | - | Domain version |
| `domain.draft` | boolean | No | If true, the domain will be drafted in EventCatalog with all it's services / messages. (Added in v7.3.0) |
| `domain.generateMarkdown` | function | - | Function to override the default markdown generation for the domain. See [Markdown templates](#markdown-templates) for more information. |
| `messages.generateMarkdown` | function | - | Function to override the default markdown generation for the message. See [Markdown templates](#markdown-templates) for more information. |
| `messages.id` | object | - | Configure the id of the messages that are generated (for example, set a prefix to all messages that are generated) _(Added in v7.4.1)_ [(Read more)](/docs/plugins/openapi/features#adding-prefix-to-all-messages) |
| `messages.id.prefix` | string | - | A prefix value for the message that is generated. For example a message with the operationId `getOrders` with a configured prefix of `hello-` will be `hello-getOrders`. _(Added in v7.4.1)_ [(Read more)](/docs/plugins/openapi/features#adding-prefix-to-all-messages) |
| `messages.id.separator` | string | `-` | The separator to use between the prefix and the message id. _(Added in v7.4.1)_ [(Read more)](/docs/plugins/openapi/features#adding-prefix-to-all-messages) |
| `messages.id.prefixWithServiceId` | boolean | - | If true, the service id will be added to the id of the messages that are generated. For example a message with the operationId `getOrders` and the service id `orders-service` will be `orders-service-getOrders`. _(Added in v7.4.1)_ [(Read more)](/docs/plugins/openapi/features#adding-prefix-to-all-messages) |
| `writeFilesToRoot` | boolean | `false` | Write OpenAPI messages to root instead of service folder. By default all domains, services and messages 
will be grouped in the folder directory structure. |
| `saveParsedSpecFile` | boolean | `false` | Parse and save expanded OpenAPI spec (helpful for files with $refs) |
| `sidebarBadgeType` | string | `HTTP_METHOD` | (Added in v5.0.1) Decides what badges are shown in the [documentation sidebar](/docs/development/customization/documentation-sidebar). `HTTP_METHOD` shows HTTP methods as badges, `MESSAGE_TYPE` shows `QUERY`, `COMMAND` or `EVENT` as badges. |
| `httpMethodsToMessages` | object | - | (Added in v5.0.2) Gives you the ability to map HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, etc.) to message types (`command`, `query`, `event`). By default OpenAPI will map your requests to queries, you can use this property to change this behavior or use the `x-eventcatalog-message-type` extension to set the message type for each request. **If you use the `x-eventcatalog-message-type` extension in your spec file, this will be used.** |
| `preserveExistingMessages` | boolean | true | (Added in v5.0.5) If true, the existing message markdown is preserved on new generation (default is true). Setting to false will always write the message markdown from the OpenAPI spec file. |
| `parseExamples` | boolean | true | <AddedIn version="7.9.0" pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/> When enabled, parses examples from OpenAPI operations (request body and response examples) and writes them to each message's `examples` folder as JSON files. Set to `false` to disable. |

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
    // Add single OpenAPI file to a domain
    [
      '@eventcatalog/generator-openapi',
      {
        services: [
          { 
            path: path.join(__dirname, 'openapi-files', 'orders-service.yml'),
            id: 'orders-service',
            version: '1.0.0'
          }
        ],
        domain: { id: 'orders', name: 'Orders', version: '0.0.1' },
        // Will render POST, GET, PUT, DELETE as badges in the sidebar
        sidebarBadgeType: 'HTTP_METHOD',
        // or set the license key via the environment variable as EVENTCATALOG_LICENSE_KEY_OPENAPI
        licenseKey: 'YOUR_LICENSE_KEY'
      },
    ],
    // Add multiple OpenAPI files to a domain
    [
      '@eventcatalog/generator-openapi',
      {
        services: [
          { 
            path: path.join(__dirname, 'openapi-files', 'payment-service.yml'),
            id: 'payment-service'
          },
          { 
            path: path.join(__dirname, 'openapi-files', 'fraud-detection-service.yml'),
            id: 'fraud-detection-service'
          }
        ],
        domain: { id: 'payment', name: 'Payment', version: '0.0.1' },
        // Will render QUERY, COMMAND, EVENT as badges in the sidebar
        sidebarBadgeType: 'MESSAGE_TYPE',
        // Here we map the HTTP methods to the message types for EventCatalog (optional)
        // e.g All post requests are mapped to commands, all get requests are mapped to queries
        httpMethodsToMessages: {
          GET: 'query',
          POST: 'command',
          PUT: 'command',
          DELETE: 'command',
        }
        // or set the license key via the environment variable as EVENTCATALOG_LICENSE_KEY_OPENAPI
        licenseKey: 'YOUR_LICENSE_KEY'
      },
    ],
  ],
};
```

You can view an example configuration in the [EventCatalog OpenAPI plugin GitHub repository](https://github.com/event-catalog/generators/blob/main/examples/generator-openapi/basic/eventcatalog.config.js).

## Markdown templates

<AddedIn version="7.2.1" pkg="@eventcatalog/generator-openapi" url="https://github.com/event-catalog/generators/releases/tag/v"/>

The EventCatalog OpenAPI plugin will generate default markdown for each domain, service and message.

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
      '@eventcatalog/generator-openapi',
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
        '@eventcatalog/generator-openapi',
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
  | `document` | object | OpenAPI.Document | The OpenAPI document object. |


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
        '@eventcatalog/generator-openapi',
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
  | `operation` | object | OpenAPI.Operation | The operation object from the OpenAPI document. |
  | `markdown` | string | - | The default markdown for the message. Incase you want to preserve the default markdown you can use this argument to add to your own markdown. |

  </TabItem>
</Tabs>






## Need help?

If you have questions or need help, you can join our [Discord community](https://eventcatalog.dev/discord)
or refer to the [OpenAPI examples on GitHub](https://github.com/event-catalog/generators/tree/main/examples/generator-openapi).












