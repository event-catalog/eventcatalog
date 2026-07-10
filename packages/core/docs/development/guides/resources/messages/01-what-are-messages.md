---
sidebar_position: 1
keywords:
- EventCatalog queries
- Queries
sidebar_label: What are messages?
title: What are messages?
description: Understand events, commands, and queries in EventCatalog.
---

import ProjectTree from '@site/src/components/MDX/ProjectTree';

EventCatalog supports different types of messages ([commands](/docs/development/guides/resources/messages/message-types/commands), [events](/docs/development/guides/resources/messages/message-types/events) and [queries](/docs/development/guides/resources/messages/message-types/queries)).

- **Commands** - represent intent, commands can be rejected in distributed systems.
- **Events** - represents an immutable fact.
- **Queries** - represent requests for information.


### Linking messages to services, domains and channels

- Messages can be sent (producer) or received (consumer) by [services](/docs/development/guides/resources/services/introduction), [domains](/docs/development/guides/domains/add-resources-to-domains/add-messages-to-domains) or be totally independent.
- You can also route messages through one or more [channels](/docs/development/guides/resources/messages/message-channels/adding-messages-to-services) (e.g queue, broker, bus).

### Where do messages live?

Messages can live anywhere in your catalog, at the service level or domain level.

**Example of a message living at the service level**

Here we have the `OrderPlaced` message living at the service level.

<ProjectTree
  items={[
    {
      name: 'services',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'Orders',
          type: 'folder',
          defaultOpen: true,
          children: [
            {
              name: 'events',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'OrderPlaced',
                  type: 'folder',
                  defaultOpen: true,
                  children: [{ name: 'index.mdx', highlight: true }],
                },
              ],
            },
          ],
        },
      ],
    },
  ]}
/>

**Example of a message living at the domain level**

Here we have the `OrderPlaced` message living at the domain level.

<ProjectTree
  items={[
    {
      name: 'domains',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'Orders',
          type: 'folder',
          defaultOpen: true,
          children: [
            {
              name: 'events',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'OrderPlaced',
                  type: 'folder',
                  defaultOpen: true,
                  children: [{ name: 'index.mdx', highlight: true }],
                },
              ],
            },
          ],
        },
      ],
    },
  ]}
/>

:::tip You can reference messages from anywhere in your catalog
It does not matter where you store your messages, you can reference them from anywhere in your catalog.
Your domains and services will reference them by their `id` and optionally the `version`. EventCatalog will resolve the message.
:::
