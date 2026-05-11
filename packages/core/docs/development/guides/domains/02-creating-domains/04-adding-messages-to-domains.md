---
sidebar_position: 4
keywords:
- EventCatalog domains
- domain messages
sidebar_label: Adding messages to domains
title: Adding messages to domains
description: Document event flows at the domain level.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.7.0" />

Adding [messages](/docs/development/guides/messages/overview) to your domains allows you to document which messages are published and consumed by your domain.

Some teams may prefer to document messages at the domain level, and have the service reference the domain messages (implementation of the domain messages).

These can be known as "domain events", "external events" or "integration events", it's really up to you how you want to model them.

These messages can live anywhere in your catalog, at the domain level or within the service folder. You just need to reference them in your domain frontmatter.

## Adding messages using frontmatter

To add messages to a domain you need to define them in either the `sends` or `receives` array within your domain frontmatter API.

- sends: messages this domain publishes
- receives: messages this domain consumes

You need to add the `id` of the message and optionally the `version` of the message.

```md title="/domains/Orders/index.mdx (example)"
---
id: Orders
... # other domain frontmatter
receives:
    # id of the message this domain receives
    - id: PaymentProcessed
    # (optional) The version of the message you want to add.
    # If no version is given the latest version of the message will be used.
      version: 0.0.1
sends:
    # id of the message this domain sends
    - id: OrderCreated
      version: 2.0.1
---

<!-- Markdown content... -->

```

The `sends` and `receives` fields in your domain tell EventCatalog which messages this domain either publishes or consumes.

In the example above we can see that the `Orders` domain receives the `PaymentProcessed` message and sends the `OrderCreated` message.

## Domain vs service level messaging

Messages can be documented at either the domain level or service level. This is flexible and it's up to you which you prefer.

- Service Level
  - You document messages a particular service publishes or consumes.
- Domain Level
  - You document messages that are published or consumed by a domain.

Remember you can also use both approaches together, and your messages can live anywhere in your catalog.

## Using semver versioning

<AddedIn version="2.4.0" />

You can use [semver](https://semver.org/) syntax when referencing messages in your domains.

```md title="/domains/Orders/index.mdx (example)"
---
id: Orders
... # other domain frontmatter
receives:
    # Domain receives a message called PaymentProcessed
    # The latest minor/patch version of this event will be used
    - id: PaymentProcessed
      version: 1.x.x
sends:
    # Domain sends a message called OrderCreated
    # This pulls the latest patch version of OrderCreated
    - id: OrderCreated
      version: 2.0.x
    # Domain sends a message called OrderCancelled
    # This pulls the latest minor/patch version of OrderCancelled
    - id: OrderCancelled
      version: >1.0.1
---

<!-- Markdown content... -->

```

Although it's recommended to link to a version of a message it is now optional. If no version is given the latest version is used by default.

## Visualizing messages within a domain

Messages are shown in the sidebar of your domain under "Publishes Messages" and "Consumes Messages" sections. There is currently no visualizer support for messages at the domain level.

_Coming soon: Visualizer support for messages at the domain level._

## Making changes and versioning

You can make as many changes as you want, but if you are adding or removing messages you may want to consider versioning your domain. This allows you to keep historic changes, and let others understand why messages are coming in or out of a particular domain.
