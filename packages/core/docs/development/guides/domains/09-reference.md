---
keywords:
- EventCatalog domains
- Domain frontmatter
sidebar_position: 9
sidebar_label: Reference
title: Domains reference
description: Frontmatter fields, paths, and routes for domains in EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

This page lists the fields, paths, and routes supported by domains.

## Paths

Domains can be created at the root of the `domains` folder:

```txt
/domains/{Domain Name}/index.mdx
```

Subdomains can be created inside a domain:

```txt
/domains/{Domain Name}/subdomains/{Subdomain Name}/index.mdx
```

## Routes

| Route | Description |
|-------|-------------|
| `/docs/domains/{domain-id}/{version}` | Domain documentation page. |
| `/visualiser/domains/{domain-id}/{version}` | Domain resource diagram. |
| `/visualiser/domains/{domain-id}/{version}/systems-context` | System context map for systems inside a domain. |
| `/visualiser/domains/{domain-id}/{version}/entity-map` | Entity map for entities inside a domain. |

## Frontmatter example

Domains are Markdown files. They support content, MDX components, and [frontmatter](https://jekyllrb.com/docs/front-matter/).

```md title="/domains/Orders/index.mdx (example)"
---
# id of your domain, used for slugs and references in EventCatalog.
id: Orders

# Display name of the domain, rendered in EventCatalog.
name: Orders

# Version of the domain.
version: 0.0.1

# Short summary of your domain.
summary: |
  Domain that contains order related information.

# Optional owners, references teams or users.
owners:
  - dboyne

# Optional systems. Groups systems into this domain.
systems:
  # System id to include in this domain.
  - id: PaymentProcessingSystem
    # Optional version of the system. Latest version is used if not provided.
    version: 1.0.0

# Optional services. Groups services into this domain.
services:
  # Service id to include in this domain.
  - id: PaymentService
    # Optional version of the service. Latest version is used if not provided.
    version: 0.0.1

# Optional flows associated with this domain.
flows:
  # Flow id to include in this domain.
  - id: OrderProcessing
    # Optional version of the flow. Latest version is used if not provided.
    version: 1.0.0

# Optional messages this domain sends.
sends:
  # Message id sent by this domain.
  - id: OrderCreated
    # Optional version of the message. Latest version is used if not provided.
    version: 1.0.0

# Optional messages this domain receives.
receives:
  # Message id received by this domain.
  - id: PaymentInitiated
    # Optional version of the message. Latest version is used if not provided.
    version: 1.0.0

# Optional badges, rendered to UI by EventCatalog.
badges:
  # Badge text.
  - content: New domain
    # Badge background color.
    backgroundColor: blue
    # Badge text color.
    textColor: blue
    # Optional icon from the supported icon set.
    icon: BoltIcon
---

## Overview

Domain that contains all services related to orders.

<NodeGraph />
```

## Required fields

### `id` {#id}

- Type: `string`

Unique id of the domain. EventCatalog uses this for references and slugs.

```mdx title="Example"
---
id: Orders
---
```

### `name` {#name}

- Type: `string`

Name of the domain. This is used to display the domain name in the UI.

```mdx title="Example"
---
name: My orders domain
---
```

### `version` {#version}

- Type: `string`

Version of the domain.

```mdx title="Example"
---
version: 0.0.1
---
```

## Optional fields

### `summary` {#summary}

Short summary of your domain, shown on domain summary pages.

```mdx title="Example"
---
summary: |
  Domain that contains everything about orders.
---
```

### `owners` {#owners}

An array of team or user ids that own the domain.

```mdx title="Example"
---
owners:
  - dboyne
  - platform-team
---
```

### `domains` {#domains}

An array of subdomain ids that belong to this domain.

```md title="Example"
---
domains:
  - id: Payments
  - id: Shipping
    # Optional version of the subdomain, latest version is used if not provided.
    version: 1.0.0
---
```

### `systems` {#systems}

<AddedIn version="4.0" />

An array of [system](/docs/development/guides/systems/introduction) ids that belong to this domain.

```md title="Example"
---
systems:
  - id: CheckoutSystem
  - id: PaymentProcessingSystem
    # Optional version of the system, latest version is used if not provided.
    version: 1.0.0
---
```

### `services` {#services}

An array of service ids that belong to this domain.

```md title="Example"
---
services:
  - id: InventoryService
  - id: OrderService
    # Optional version of the service, latest version is used if not provided.
    version: 0.0.1
---
```

### `agents` {#agents}

<AddedIn version="3.41.0" />

An array of [agent](/docs/development/guides/resources/agents/introduction) ids that belong to this domain.

```md title="Example"
---
agents:
  - id: FraudReviewAgent
  - id: CustomerSupportAgent
    # Optional version of the agent, latest version is used if not provided.
    version: 1.0.0
---
```

### `entities` {#entities}

<AddedIn version="2.36.0" />

An array of [entity](/docs/development/guides/resources/entities/introduction) ids that belong to this domain.

```md title="Example"
---
entities:
  - id: Order
  - id: OrderItem
    # Optional version of the entity, latest version is used if not provided.
    version: 0.0.1
---
```

### `data-products` {#data-products}

<AddedIn version="3.8.0" />

An array of [data product](/docs/development/guides/resources/data-products/introduction) ids that belong to this domain.

```md title="Example"
---
data-products:
  - id: order-analytics
  - id: payment-analytics
    # Optional version of the data product, latest version is used if not provided.
    version: 1.0.0
---
```

### `flows` {#flows}

An array of [flow](/docs/development/guides/resources/flows/introduction) ids that are associated with this domain.

```md title="Example"
---
flows:
  - id: OrderProcessing
  - id: PaymentFlow
    # Optional version of the flow, latest version is used if not provided.
    version: 1.0.0
---
```

### `sends` {#sends}

<AddedIn version="3.7.0" />

An array of [message](/docs/development/guides/resources/messages/what-are-messages) ids that this domain sends or publishes.

In Domain-Driven Design these can be classed as domain events, which are events that are published by the domain.

This allows you to document messages at a domain level and have services document them as the implementation of the domain event.

:::tip Where to store these messages?

You can store messages anywhere in your catalog. If you prefer, you can store them in your domain folder.

```md
domains/
  Orders/
    events/
      OrderCreated/
        index.mdx
```

:::

```md title="Example"
---
sends:
  - id: OrderCreated
  - id: PaymentProcessed
    # Optional version of the message, latest version is used if not provided.
    version: 1.0.0
---
```

### `receives` {#receives}

<AddedIn version="3.7.0" />

An array of [message](/docs/development/guides/resources/messages/what-are-messages) ids that this domain receives.

These are typically messages that are consumed by your domain from outside its boundary.

```md title="Example"
---
receives:
  - id: PaymentInitiated
  - id: FraudDetected
    # Optional version of the message, latest version is used if not provided.
    version: 0.0.1
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
    # Optional icon to display from lucide icons.
    # Or the name of a broker, for example Kafka or EventBridge.
    icon: BoltIcon
---
```

#### Use named colors

Set `backgroundColor` or `textColor` to a named palette token for automatic light and dark mode adaptation.

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
    url: https://runbooks.example.com/my-domain
    backgroundColor: blue
    textColor: white
---
```

### `specifications` {#specifications}

<AddedIn version="2.6.0" />

Specifications to include on the domain page.

<AddedIn version="2.39.1" />

You can assign one or more specifications to a domain.

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

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `type` | `string` | Yes | The type of specification. |
| `path` | `string` | Yes | The path to the specification file. |
| `name` | `string` | No | Optional friendly name of the specification, rendered in the UI. |

**Older versions of EventCatalog (< 2.39.0)**

If you are using an older version of EventCatalog, use the following syntax.

```mdx title="Example"
---
specifications:
  asyncapiPath: order-service-asyncapi.yaml
  openapiPath: openapi.yml
---
```

### `repository` {#repository}

Repository metadata for the domain.

```mdx title="Example"
---
repository:
  url: https://github.com/event-catalog/eventcatalog
  language: TypeScript
---
```

### `diagrams` {#diagrams}

An array of diagrams associated with the domain.

```mdx title="Example"
---
diagrams:
  - id: orders-context
    version: 1.0.0
---
```

### `visualiser` {#visualiser}

<AddedIn version="2.39.2" />

Turn off the visualiser for this resource. This means the resource will not be included in the visualiser or the navigation bar for the visualiser.

Default: `true`

```mdx title="Example"
---
visualiser: false
---
```

### `editUrl` {#editUrl}

<AddedIn version="2.49.4" />

Override the default edit URL for the page. This is used to navigate the user to the edit page for the page, for example GitHub or GitLab.

```mdx title="Example"
---
editUrl: https://github.com/event-catalog/eventcatalog/edit/main/domains/Orders/index.mdx
---
```

### `attachments` {#attachments}

<AddedIn version="2.57.2" />

An array of attachments for this domain.

```mdx title="Example"
---
attachments:
  - url: https://example.com/adr/001
    title: ADR-001 - Use Kafka for asynchronous messaging
    description: Learn more about why we chose Kafka for asynchronous messaging in this architecture decision record.
    type: architecture-decisions
    icon: FileTextIcon
  - https://example.com/adr/002
---
```

The attachments can be a URL string or an object with additional properties.

| Property | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `url` | `string` | Yes | The URL of the attachment. |
| `title` | `string` | No | The title of the attachment. |
| `description` | `string` | No | The description of the attachment. |
| `type` | `string` | No | The type of the attachment, used to group attachments in the UI. |
| `icon` | `string` | No | The icon of the attachment. You can pick from the [lucide icons](https://lucide.dev/icons/) library. |
