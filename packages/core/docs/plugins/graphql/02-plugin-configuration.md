---
sidebar_position: 1
keywords:
- EventCatalog GraphQL plugin
sidebar_label: Plugin Configuration
title: Plugin Configuration
description: Configuration of the EventCatalog GraphQL plugin
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Plugin Configuration

## Overview

The EventCatalog GraphQL plugin is configured in the `eventcatalog.config.js` file inside the `generators` array.

## Required Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `services` | `Service[]` | Yes | List of GraphQL schema files to add to your catalog, and the service name and version |
| `licenseKey` | string | Yes* | EventCatalog Scale license key. Get a 30-day trial at [EventCatalog Cloud](https://eventcatalog.cloud). Can also be set via the `EVENTCATALOG_SCALE_LICENSE_KEY` environment variable. |

### Service Configuration

Each service in the `services` array requires the following properties:

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | EventCatalog ID for the service. This is required and must be unique. |
| `path` | string | Yes | Path to your GraphQL schema file |
| `version` | string | Yes | Version of the service. _EventCatalog resources are versioned, you must specify a version for the service._|
| `owners` | string[] | No | Owners of the service. You can assign EventCatalog users or teams to services. Setting owners on the service will also set the owners of the messages in the GraphQL schema. If owners are already set on any resource, those owners are persisted. |
| `name` | string | No | Display name for the service. If not provided, the `id` will be used. |
| `summary` | string | No | Short summary of the service. |
| `generateMarkdown` | function | - | Function to override the default markdown generation for the service. See [Markdown templates](#markdown-templates) for more information. |
| `writesTo` | array[\{id: string, version?: string\}] | No | Array of [data stores](/docs/development/guides/resources/data/introduction) id and version (optional) that the service writes to. (Added in v0.4.4) |
| `readsFrom` | array[\{id: string, version?: string\}] | No | Array of [data stores](/docs/development/guides/resources/data/introduction) id and version (optional) that the service reads from. (Added in v0.4.0) |

## Optional Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `domain` | object | - | Domain to associate all configured services with |
| `domain.id` | string | - | Domain identifier |
| `domain.name` | string | - | Domain display name |
| `domain.version` | string | - | Domain version |
| `domain.owners` | string[] | - | Owners of the domain. If owners are already set on the domain, those owners are persisted. |
| `domain.markdown` | string | - | Custom markdown content for the domain. |
| `messages.generateMarkdown` | function | - | Function to override the default markdown generation for the message. See [Markdown templates](#markdown-templates) for more information. |
| `writeFilesToRoot` | boolean | `false` | Write GraphQL messages to root instead of service folder. By default all domains, services and messages will be grouped in the folder directory structure. |

## Example Configuration

```js title="eventcatalog.config.js"
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

/** @type {import('@eventcatalog/core/bin/eventcatalog.config').Config} */
export default {
  cId: "10b46030-5736-4600-8254-421c3ed56e47",
  title: "GraphQL API Catalog",
  tagline: "Your GraphQL API Documentation",
  organizationName: "Your Organization",
  homepageLink: "https://eventcatalog.dev/",
  editUrl: "https://github.com/your-org/your-catalog/edit/master",
  trailingSlash: false,
  base: "/",
  logo: {
    alt: "EventCatalog Logo",
    src: "/logo.png",
    text: "Your Organization",
  },
  docs: {
    sidebar: {
      showPageHeadings: true,
    },
  },
  generators: [
    [
      '@eventcatalog/generator-graphql',
      {
        services: [
          {
            id: 'User Service',
            version: '1.0.0',
            name: 'User Service',
            path: path.join(__dirname, 'graphql-schemas', 'user-service.graphql'),
            owners: ['team-users']
          },
          {
            id: 'Order Service',
            version: '1.2.0',
            name: 'Order Service',
            path: path.join(__dirname, 'graphql-schemas', 'order-service.graphql'),
            owners: ['team-orders']
          },
        ],
        domain: { id: 'ecommerce', name: 'E-commerce', version: '0.0.1' },
      },
    ],
    [
      '@eventcatalog/generator-graphql',
      {
        services: [
          {
            id: 'Analytics Service',
            version: '3.0.0',
            name: 'Analytics Service',
            path: path.join(__dirname, 'graphql-schemas', 'analytics-service.graphql'),
            draft: true
          },
        ],
        domain: { id: 'analytics', name: 'Analytics', version: '0.0.1' },
        debug: true
      },
    ],
  ],
};
```

You can view an example configuration in the [EventCatalog GraphQL plugin GitHub repository](https://github.com/event-catalog/generators/blob/main/examples/generator-graphql/basic/eventcatalog.config.js).
