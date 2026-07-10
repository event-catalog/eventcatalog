---
sidebar_position: 2
keywords:
- EventCatalog events
sidebar_label: Create an event
title: Create an event
description: Creating and managing events within EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PromptBox from '@site/src/components/MDX/PromptBox';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

Events are a type of message in EventCatalog that represent an immutable fact.

![Example](../../../img/events/example.png)

## Adding a new event

### Automatic Creation

<PromptBox preview="Create a new EventCatalog event">
Read https://www.eventcatalog.dev/docs/development/guides/resources/messages/create-messages/create-event.md and https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/events.md then help me create a new EventCatalog event in my catalog.

Ask me for the event name, what happened, summary, whether it belongs at the root of the catalog or inside a service, domain, or system, and any known producers, consumers, channels, or schema files. Then create the correct events/{'{Event Name}'}/index.mdx, services/{'{Service Name}'}/events/{'{Event Name}'}/index.mdx, domains/{'{Domain Name}'}/events/{'{Event Name}'}/index.mdx, or domains/{'{Domain Name}'}/systems/{'{System Name}'}/services/{'{Service Name}'}/events/{'{Event Name}'}/index.mdx file with frontmatter and starter markdown, you can add as much markdown as you want that captures the users input.

You can also ask the user if they have a schema of the event, if they provide one, you can add this schema to the event, and set the schemaPath to that schema on the event frontmatter properties.

If the catalog does not have any services, domains, or systems, put it into the root events folder.

You can use MDX components found here https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/components.md
</PromptBox>

Copy this prompt and paste it into your coding agent. Your agent can help you choose where the event should live, create the right folder structure, and add the first version of the event documentation.

### Manual Creation

Events live in a `/events` folder. This folder can be placed:

- At the root of your catalog
- Inside a specific service or domain folder

<ProjectTree
  items={[
    {
      name: 'events',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'InventoryAdjusted',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'index.mdx', highlight: true }],
        },
      ],
    },
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

The contents are split into two sections, **frontmatter** and the **markdown content**.

_Here is an example of what a event markdown file may look like._

```md title="/events/InventoryAdjusted/index.mdx (example)"
---
# id of your event, used for slugs and references in EventCatalog.
id: InventoryAdjusted

# Display name of the event, rendered in EventCatalog
name: Inventory Adjusted

# Version of the event
version: 0.0.4

# Short summary of your event
summary: |
  Event with the intent to adjust the inventory

# Optional owners, references teams or users
owners:
    - dboyne

# Optional badges, rendered to UI by EventCatalog
badges:
    - content: New service
      backgroundColor: blue
      textColor: blue
---

## Overview

The `Inventory Adjusted` event represents intent to adjust the inventory of a given item.

<NodeGraph />

```

Once this file is added, the event will automatically appear across EventCatalog.

### Assign producers and consumers to your event

To add producers or consumers to your event you can read the [guide on adding messages to services](/docs/development/guides/resources/messages/connect-messages/map-producers-and-consumers).

You can also assign your event to one or more [channels](/docs/development/guides/resources/messages/message-channels/adding-messages-to-services) (e.g Kafka, RabbitMQ, AWS SQS, AWS SNS, etc).

### Adding schemas to your event

You can add any schema format to your event, you can read the [guide on adding schemas to messages](/docs/development/guides/resources/schemas/add-schemas-to-messages).

