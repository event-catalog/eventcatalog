---
sidebar_position: 2
keywords:
- EventCatalog domains
sidebar_label: Creating a service
title: Creating services
description: Creating and managing services within EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

Services in EventCatalog are a great way to document which parts of your systems send and receive messages.

You can also add specifications [(OpenAPI, AsyncAPI, GraphQL)](/docs/development/guides/services/adding-to-services/openapi) to your services.

### What do services look like in EventCatalog?

![Example](../img/services/service-example.png)

[View Demo of an Orders service &rarr;](https://demo.eventcatalog.dev/docs/services/OrdersService/0.0.3)

## Adding a new service

To add a new service create a new folder within the `/services` folder with an `index.mdx` file.

- `/services/{Service Name}/index.mdx` 
  - (example `/services/Orders/index.mdx`)

You can also specify services in your domains folder.
- `/domains/{Domain Name}/services/{Service Name}/index.mdx` 
  - (example `/domains/Orders/services/OrdersService/index.mdx`)

_Here is an example of what a service markdown file may look like._

```md title="/services/Orders/index.mdx (example)"
---
# id of your service, used for slugs and references in EventCatalog.
id: Orders

# Display name of the Service, rendered in EventCatalog
name: Orders

# Version of the Service
version: 0.0.1

# Short summary of your Service
summary: |
  Service that contains order related information

# Optional owners, references teams or users
owners:
    - dboyne

# Optional messages this service receives and it's version
receives:
  - id: InventoryAdjusted
    version: 0.0.3

# Optional messages this service sends and it's version
sends:
  - id: AddInventory
    version: 0.0.3

# Optional flows associated with this service
flows:
  - id: OrderProcessing
    version: 1.0.0

# Optional badges, rendered to UI by EventCatalog
badges:
    - content: New service
      backgroundColor: blue
      textColor: blue
---

## Overview

This orders service gives API consumers the ability to produce orders in the systems. Events are raised from this system for downstream consumption.

<NodeGraph />

```

## Adding content

With **services** you can write any Markdown you want and it will render on your page. Every service gets its own page.

Within your markdown content you can use [components](/docs/development/components/using-components) to add interactive components to your page.

## Adding specifications to your service

You can add GraphQL, OpenAPI or AsyncAPI specifications to your service.

You can read more about adding specifications to your service [here](/docs/development/guides/services/adding-to-services/openapi).

## Custom icon

<AddedIn version="3.28.1" />

Set `styles.icon` in your frontmatter to display a custom icon on the service. The icon appears in the visualiser node, sidebar navigation, page header, and search results.

```md title="/services/Orders/index.mdx (example)"
---
id: Orders
name: Orders
version: 0.0.1
styles:
  icon: /icons/languages/dotnet.svg
---
```

The value can be a path to a file in your catalog's `public/` folder (e.g. `/icons/logo.svg`) or an absolute URL (e.g. `https://cdn.simpleicons.org/nodejs`). [Simple Icons CDN](https://cdn.simpleicons.org) is a useful source for brand logos.

