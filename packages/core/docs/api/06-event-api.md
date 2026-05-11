---
sidebar_position: 4
sidebar_label: Event API
title: Event frontmatter API
description: Understanding the API for events.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

## Overview {#overview}

Events are just markdown files, with this comes the use of Content, MDX components and also [front-matter](https://jekyllrb.com/docs/front-matter/).

Here is an example of the event frontmatter you will find in your `/events` folder.

```md title="/events/InventoryOutOfStock/index.mdx (example)"
---
# id of your event, used for slugs and references in EventCatalog.
id: InventoryOutOfStock

# Display name of the event, rendered in EventCatalog
name: Out of stock

# Version of the event
version: 0.0.3

# Short summary of your event
summary: |
  Event that is raised when an inventory item goes out of stock.

# Optional owners, references teams or users
owners:
    - dboyne

repository:
  language: JavaScript
  url: https://github.com/event-catalog/pretend-shipping-service

# Optional badges, rendered to UI by EventCatalog
badges:
    - content: New event
      backgroundColor: blue
      textColor: blue
      # Optional link to display (optional)
      link: https://github.com/event-catalog/pretend-shipping-service
---

## Overview

Event is published when the inventory is out of stock.

<NodeGraph />

```

## Required fields {#required-fields}

### `id` {#id}

- Type: `string`

Unqiue id of the event. EventCatalog uses this for references and slugs.

```mdx title="Example"
---
  id: InventoryOutOfStock
---
```

### `name` {#name}

- Type: `string`

Name of the event this is used to display the name on the UI.

```mdx title="Example"
---
  name: Out of stock
---
```

### `version` {#version}

- Type: `string`

Version of the event. 

```mdx title="Example"
---
  version: 0.0.1
---
```

## Optional fields {#optional-fields}

<AddedIn version="3.18.0" />

### `operation` {#operation}

Document an HTTP operation for this event. When set, the visualiser displays an HTTP method badge, API path, and status code pills on the event node.

```mdx title="Example"
---
  operation:
    method: POST
    path: /orders
    statusCodes:
      - "201"
      - "400"
---
```

| Property | Type | Required | Description |
| -------- | -------- | -------- | -------- |
| `method` | `'GET' \| 'POST' \| 'PUT' \| 'DELETE' \| 'PATCH'` | No | The HTTP method for the operation |
| `path` | `string` | No | The API path for the operation |
| `statusCodes` | `string[]` | No | List of HTTP status codes the operation may return |

### `summary` {#summary}

Short summary of your event, shown on event summary pages.

```mdx title="Example"
---
  summary: |
    Event that is raised when an inventory item goes out of stock.
---
```

### `owners` {#owners}

An array of user ids that own the event.

```mdx title="Example"
---
  owners:
    - dboyne
    - mSmith
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
      # Or the name of the broker (e.g Kafka, EventBridge, etc)
      icon: BoltIcon
---
```

### `schemaPath` {#schemaPath}

Path to the schema of the message.

_Path is relative_.

```mdx title="Example"
---
  schemaPath: schema.json
---
```

### `repository` {#repository}

<AddedIn version="2.11.2" />

Repository language and code url for the event.

```mdx title="Example"
---
  repository:
    language: JavaScript
    url: https://github.com/event-catalog/pretend-shipping-service
---
```

### `sidebar` {#sidebar}

<AddedIn version="2.29.3" />

Configure the event label and message in the [docs sidebar](/docs/development/customization/customize-sidebars/documentation-sidebar).

```mdx title="Example"
---
  sidebar:
    badge: Event
    label: Inventory Adjusted
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
```

### `draft` {#draft}

<AddedIn version="2.48.4" />

Mark the event as a draft. This will show the event as a draft in the UI.

You can also specify a title and summary for your draft to help you communicate the status of the draft.

```md title="/commands/UpdateInventoryStock/index.mdx (example)"
---
# Uses the default title and summary to mark things as draft in the UI
draft: true

# Or you can specify a title and summary for your draft
draft: 
  title: "Update Inventory Stock 1.0.1 is in draft"
  # Supports markdown
  message: |
    ### New version of Update Inventory Stock command is in draft

    This is a new version of the Update Inventory Stock command. It is not yet ready for production. We are still working on it and collecting feedback from the team.
    You can use this version in lower environments, **but please be aware that it is still in draft and may change.**
    You can still use a previous version of the command, [Update Inventory Stock 1.0.0](/docs/commands/UpdateInventoryStock/1.0.0), until that version is deprecated.
    _If you would like to provide feedback, please contact us at [feedback@eventcatalog.io](mailto:feedback@eventcatalog.io) or our slack channel [Order Management](https://join.slack.com/t/eventcatalog/shared_invite/zt-1q900000000000000000000000000000)_

---

```

### `editUrl` {#editUrl}

<AddedIn version="2.49.4" />

Override the default edit url for the page. This is used to navigate the user to the edit page for the page (e.g GitHub, GitLab url).

```mdx title="Example"
---
  editUrl: https://github.com/event-catalog/eventcatalog/edit/main/events/InventoryOutOfStock/index.mdx
---
```

### `detailsPanel` {#detailsPanel}

<AddedIn version="2.53.0" />

Override the default details panel for the page. You can use this show/hide areas of the details panel.

![Details panel](./img/domain-details-panel.png)

```mdx title="Example"
---
  detailsPanel:
    producers:
      visible: false
    consumers:
      visible: false
    channels:
      visible: false
    versions:
      visible: false
---
```

Options:

| Property | Type | Required | Description |
| -------- | -------- | -------- | -------- |
| `producers` | `object` | No | An object with a `visible` property to show/hide the producers section |
| `consumers` | `object` | No | An object with a `visible` property to show/hide the consumers section |
| `channels` | `object` | No | An object with a `visible` property to show/hide the channels section |
| `versions` | `object` | No | An object with a `visible` property to show/hide the versions section |
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