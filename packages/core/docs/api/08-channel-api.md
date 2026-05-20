---
sidebar_position: 5
sidebar_label: Channel API
title: Channel frontmatter API
description: Understanding the API for channels.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.13.0" />

## Overview {#overview}

Channels are just markdown files, with this comes the use of Content, MDX components and also [front-matter](https://jekyllrb.com/docs/front-matter/).

Here is an example of the channel frontmatter you will find in your `/channels` folder.

```md title="/channels/inventory.{env}.events/index.mdx (example)"
---
# id of your channel, used for slugs and references in EventCatalog.
id: inventory.{env}.events

# Display name of the channel, rendered in EventCatalog
name: Inventory Events Channel

# Version of the channel
version: 1.0.0

# Short summary of your channel
summary: |
  Central event stream for all inventory-related events including stock updates, allocations, and adjustments

# Optional owners, references teams or users
owners:
  - dboyne

# address of the channel
# supports parameters in the address  
address: inventory.{env}.events

# list of protocols for the channel
# see https://eventcatalog.dev/docs/development/guides/channels/introduction#protocols
protocols: 
  - kafka

# Optional list of parameters for the channel
# This example shows the `env` value in the channel name can be `dev, stg, prod`.
parameters:
  env:
    enum:
      - dev
      - stg
      - prod
    description: 'Environment to use'
---

### Overview
The Inventory Events channel is the central stream for all inventory-related events across the system. This includes stock level changes, inventory allocations, adjustments, and stocktake events. Events for a specific SKU are guaranteed to be processed in sequence when using productId as the partition key.

<ChannelInformation />

```

## Required fields {#required-fields}

### `id` {#id}

- Type: `string`

Unqiue id of the channel. EventCatalog uses this for references and slugs.

```md title="Example"
---
  id: inventory.{env}.events
---
```

### `name` {#name}

- Type: `string`

Name of the channel this is used to display the name on the UI.

```mdx title="Example"
---
  name: Inventory events
---
```

### `version` {#version}

- Type: `string`

Version of the channel. 

```mdx title="Example"
---
  version: 0.0.1
---
```

## Optional fields {#optional-fields}

### `summary` {#summary}

Short summary of your channel.

```mdx title="Example"
---
  summary: |
    Central event stream for all inventory-related events including stock updates, allocations, and adjustments
---
```

### `address` {#address}

Address of the channel.

```md title="Example"
---
  # example of dynamic address
  address: inventory.{env}.events

  # static address
  address: MyEventBus
  
---
```

### `protocols` {#protocols}

Protocol/s of the channel.

```md title="Example"
---
  # example of a kafka channel
  protocol: 
    - kafka

  # example of a channel that is http, mqtt or kafka (if you ever wanted too...)
  protocol:
    - http
    - mqtt
    - kafka
  
---
```


<AddedIn version="3.18.0" />

### `deliveryGuarantee` {#deliveryGuarantee}

The delivery guarantee for messages transported through this channel. When set, the visualiser displays a colored badge on the channel node to communicate the guarantee level to your team.

```md title="Example"
---
  deliveryGuarantee: at-least-once
---
```

Accepted values:

| Value | Description |
| ----- | ----------- |
| `at-most-once` | Messages may be lost but are never delivered more than once |
| `at-least-once` | Messages are never lost but may be delivered more than once |
| `exactly-once` | Messages are delivered exactly once with no loss or duplication |

### `parameters` {#parameters}

Parameters for your channel.

```md title="Example"
---
  parameters:
    # any string value
    env:
      # list of possible values for the parameter
      enum:
        - dev
        - stg
        - prod
      # description for the parameter (optional)
      description: 'Environment to use'
      # list of examples (optional)
      examples
        - dev
        - stg
      # default value for channel
      default
        - dev
---
```

### `owners` {#owners}

An array of user ids that own the channel.

```mdx title="Example"
---
  owners:
    - dboyne
    - mSmith
---
```

### `badges` {#badges}

<AddedIn version="3.39.4" />

An array of badges that get rendered on the page.

```md title="Example"
---
  badges:
    - content: My badge
      backgroundColor: green
      textColor: green
      # Optional icon to display (from https://heroicons.com/)
      # Or the name of the broker (e.g Kafka, EventBridge, etc)
      icon: BoltIcon
---
```

#### Use named colors

Set `backgroundColor` or `textColor` to a named palette token for automatic light/dark mode adaptation.

Supported names: `slate`, `gray`, `zinc`, `neutral`, `stone`, `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`.

```md title="Named color example"
---
  badges:
    - content: Critical
      backgroundColor: red
      textColor: red
---
```

#### Use any CSS color

You can also pass any valid CSS color value directly: hex (`#ff0000`), `rgb()`, `hsl()`, `oklch()`, or a CSS variable (`var(--my-color)`).

```md title="CSS color example"
---
  badges:
    - content: Custom
      backgroundColor: "#6366f1"
      textColor: "#ffffff"
---
```

#### Link to external URLs

<AddedIn version="3.39.6" />

Add a `url` to a badge to make it render as a clickable link with an external-link icon. When `url` is omitted, the badge renders as a plain label.

```md title="Link badge example"
---
  badges:
    - content: View Runbook
      url: https://runbooks.example.com/my-channel
      backgroundColor: blue
      textColor: white
---
```

### `repository` {#repository}

<AddedIn version="2.11.2" />

Repository language and code url for the channel.

```mdx title="Example"
---
  repository:
    language: JavaScript
    url: https://github.com/event-catalog/pretend-shipping-service
---
```

### `editUrl` {#editUrl}

<AddedIn version="2.49.4" />

Override the default edit url for the page. This is used to navigate the user to the edit page for the page (e.g GitHub, GitLab url).

```mdx title="Example"
---
  editUrl: https://github.com/event-catalog/eventcatalog/edit/main/channels/inventory.{env}.events/index.mdx
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
| `messages` | `object` | No | An object with a `visible` property to show/hide the messages section |
| `protocols` | `object` | No | An object with a `visible` property to show/hide the protocols section |
| `parameters` | `object` | No | An object with a `visible` property to show/hide the parameters section |
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