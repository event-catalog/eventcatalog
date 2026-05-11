---
sidebar_position: 1
keywords:
- EventCatalog queries
- Queries
sidebar_label: Overview
title: Overview
description: What are messags in EventCatalog?
---

EventCatalog supports different types of messages ([commands](/docs/development/guides/messages/commands/introduction), [events](/docs/development/guides/messages/events/introduction) and [queries](/docs/development/guides/messages/queries/introduction)).

- **Commands**
    - Commands are messages that represent intent, commands can be rejected in distributed systems.
- **Events**
    - Events are a type of message that represent immutable facts.
- **Queries**
    - Queries are a type of message that represent requests for information.


### Linking messages to services, domains and channels

- Messages can be sent (producer) or received (consumer) by [services](/docs/development/guides/services/introduction), [domains](/docs/development/guides/domains/creating-domains/adding-messages-to-domains) or be totally independent.
- You can also route messages through one or more [channels](/docs/development/guides/channels/adding-messages-to-services).

### Where do messages live?

Messages can live anywhere in your catalog, at the service level or domain level.

**Example of a message living at the service level**

Here we have the `OrderPlaced` message living at the service level.

```md
services/
  Orders/
    events/
      OrderPlaced/
        index.mdx
```

**Example of a message living at the domain level**

Here we have the `OrderPlaced` message living at the domain level.

```md
domains/
  Orders/
    events/
      OrderPlaced/
        index.mdx
```

:::tip You can reference messages from anywhere in your catalog
It does not matter where you store your messages, you can reference them from anywhere in your catalog.
Your domains and services will reference them by their `id` and optionally the `version`. EventCatalog will resolve the message.
:::
