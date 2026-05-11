---
sidebar_position: 4
sidebar_label: Service API
title: Service frontmatter API
description: Understanding the API for services.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

## Overview {#overview}

Services are just markdown files, with this comes the use of Content, MDX components and also [front-matter](https://jekyllrb.com/docs/front-matter/).

Here is an example of the service frontmatter you will find in your `/services` folder.

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

# Optional details about the programming language and url for the code
repository:
  language: JavaScript
  url: https://github.com/event-catalog/pretend-shipping-service

# Optional badges, rendered to UI by EventCatalog
badges:
    - content: New service
      backgroundColor: blue
      textColor: blue
      # Optional icon to display (from https://heroicons.com/)
      # Or the name of the broker (e.g Kafka, EventBridge, etc)
      icon: BoltIcon
---

## Overview

This orders service gives API consumers the ability to produce orders in the systems. Events are raised from this system for downstream consumption.

<NodeGraph />

```

## Required fields {#required-fields}

### `id` {#id}

- Type: `string`

Unqiue id of the service. EventCatalog uses this for references and slugs.

```mdx title="Example"
---
  id: Orders
---
```

### `name` {#name}

- Type: `string`

Name of the service this is used to display the name on the UI.

```mdx title="Example"
---
  name: My orders service
---
```

### `version` {#version}

- Type: `string`

Version of the service. 

```mdx title="Example"
---
  version: 0.0.1
---
```

## Optional fields {#optional-fields}

### `summary` {#summary}

Short summary of your service, shown on service summary pages.

```mdx title="Example"
---
  summary: |
    service that contains everything about orders
---
```

### `owners` {#owners}

An array of user ids that own the service.

```mdx title="Example"
---
  owners:
    - dboyne
    - mSmith
---
```

### `sends` {#sends}

An array of messages (ids) the service sends. These can be commands, queries or events ids.

```mdx title="Example"
---
  sends:
    - OrderFulfilled
    - OrderComplete
---
```

### `receives` {#receives}

An array of messages (ids) the service receives. These can be commands, queries or events ids.

```mdx title="Example"
---
  receives:
    - OrderPlaced
    - OrderAdjusted
---
```

### `writesTo` {#writesTo}

<AddedIn version="2.59.0" />

An array of [data stores](/docs/development/guides/data/introduction) ids that the service writes to.
```mdx title="Example"
---
  writesTo:
    - id: OrdersDatabase
    # The version of the data store you want to add (optional, if not provided latest will be used)
      version: 0.0.1
---
```

### `readsFrom` {#readsFrom}

<AddedIn version="2.59.0" />

An array of [data stores](/docs/development/guides/data/introduction) ids that the service reads from.


```mdx title="Example"
---
  readsFrom:
    - id: OrdersDatabase
    # The version of the data store you want to add (optional, if not provided latest will be used)
      version: 0.0.1
---
```

### `entities` {#entities}

<AddedIn version="2.36.0" />

An array of [entities](/docs/development/guides/domains/entities/introduction) ids that belong to the this service.
Which entities belong to this service.

```md title="Example"
---
  entities:
    - id: Order
    - id: OrderItem
      # Optional version of the entity, latest version is used if not provided
      version: 0.0.1
---
```

### `flows` {#flows}

An array of [flows](/docs/development/guides/flows/introduction) ids that are associated with this service.

```md title="Example"
---
  flows:
    - id: OrderProcessing
    - id: PaymentFlow
      # Optional version of the flow, latest version is used if not provided
      version: 1.0.0
---
```

### `badges` {#badges}

An array of badges that get rendered on the page.

```md title="Example"
---
  badges:
    - content: My badge
      backgroundColor: blue
      textColor: blue
      # Optional icon to display (from https://heroicons.com/)
      icon: BoltIcon
---
```

### `specifications` {#specifications}

<AddedIn version="2.39.1" />

You can assign one or more specifications to a service. The visualiser shows spec type badges (OpenAPI, AsyncAPI, GraphQL) on the service node when specifications are defined, making it easy to see which specs a service exposes at a glance.

```mdx title="Example"
---
  specifications:
    - type: asyncapi
      path: order-service-asyncapi.yaml
      name: AsyncAPI Specification
    - type: openapi
      path: openapi.yml
      name: OpenAPI Specification
    - type: graphql
      path: graphql.yml
      name: GraphQL Specification
---
```

<!-- Table of properties -->

| Property | Type | Required | Description |
| -------- | -------- | -------- | -------- |
| `type` | `string` | Yes | The type of specification, currently only `asyncapi`, `openapi` and `graphql` are supported. _GraphQL added in v2.58.0_ |
| `path` | `string` | Yes | The path to the specification file |
| `name` | `string` | No | Optional friendly name of the specification, rendered in the UI |

**Older versions of EventCatalog (< 2.39.0)**

If you are using an older version of EventCatalog you will need to use the following syntax.

```mdx title="Example"
---
  specifications:
    asyncapiPath: order-service-asyncapi.yaml
    openapiPath: openapi.yml
---
```

### `visualiser` {#visualiser}

<AddedIn version="2.39.2" />

Turn off the visualiser for this resource. This means the resource will not be included in the visualiser or the navigation bar for the visualiser.

**Default: `true`**

```mdx title="Example"
---
  visualiser: false
---

### `editUrl` {#editUrl}

<AddedIn version="2.49.4" />

Override the default edit url for the page. This is used to navigate the user to the edit page for the page (e.g GitHub, GitLab url).

```mdx title="Example"
---
  editUrl: https://github.com/event-catalog/eventcatalog/edit/main/services/Orders/index.mdx
---
```

### `detailsPanel` {#detailsPanel}

<AddedIn version="2.53.0" />

Override the default details panel for the page. You can use this show/hide areas of the details panel.

![Details panel](./img/domain-details-panel.png)

```mdx title="Example"
---
  detailsPanel:
    domains:
      visible: false
    messages:
      visible: false
    versions:
      visible: false
    specifications:
      visible: false
---
```

Options:

| Property | Type | Required | Description |
| -------- | -------- | -------- | -------- |
| `domains` | `object` | No | An object with a `visible` property to show/hide the domains section |
| `messages` | `object` | No | An object with a `visible` property to show/hide the messages section (sends and receives) |
| `versions` | `object` | No | An object with a `visible` property to show/hide the versions section |
| `specifications` | `object` | No | An object with a `visible` property to show/hide the specifications section |
| `entities` | `object` | No | An object with a `visible` property to show/hide the entities section |
| `repository` | `object` | No | An object with a `visible` property to show/hide the repository section (e.g GitHub, GitLab url) |
| `owners` | `object` | No | An object with a `visible` property to show/hide the owners section |
| `changelog` | `object` | No | An object with a `visible` property to show/hide the changelog button |

### `attachments` {#attachments}

<AddedIn version="2.57.2" />

An array of attachments for this resource type.

```mdx title="Example"
---
  attachments:
    - url: https://example.com/adr/001
      title: ADR-001 - Use Kafka for asynchronous messaging
      description: Learn more about why we chose Kafka for asynchronous messaging in this architecture decision record.
      type: 'architecture-decisions'
      icon: FileTextIcon
    - https://example.com/adr/002
---

```

Options:

The attachments can be a url (string) or an object with additional properties.

Object properties:

| Property | Type | Required | Description |
| -------- | -------- | -------- | -------- |
| `url` | `string` | Yes | The url of the attachment |
| `title` | `string` | optional | The title of the attachment |
| `description` | `string` | optional | The description of the attachment |
| `type` | `string` | optional | The type of the attachment, this will be used to group attachments together in the UI |
| `icon` | `string` | optional | The icon of the attachment, you can pick from the [lucide icons](https://lucide.dev/icons/) library. |