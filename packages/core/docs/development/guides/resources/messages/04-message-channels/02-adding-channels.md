---
sidebar_position: 2
keywords:
- EventCatalog domains
sidebar_label: Creating a channel
title: Creating channels
description: Creating and managing channels within EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PromptBox from '@site/src/components/MDX/PromptBox';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

A message channel documents how messages are transported between producers and consumers. A channel might represent a Kafka topic, queue, event bus, HTTP route, webhook, or any other transport your architecture uses.

![Example](../../../img/channels/channel-page-example.png)

## Adding a new channel

### Automatic Creation

<PromptBox preview="Create a new EventCatalog channel">
Read https://www.eventcatalog.dev/docs/development/guides/resources/messages/message-channels/adding-channels.md and https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/channels.md then help me create a new EventCatalog channel in my catalog.

Ask me for the channel name, address, protocol, summary, whether the channel belongs at the root of the catalog or inside a service, domain, or system, and any known messages routed through it. Then create the correct channels/{'{Channel Name}'}/index.mdx, services/{'{Service Name}'}/channels/{'{Channel Name}'}/index.mdx, domains/{'{Domain Name}'}/channels/{'{Channel Name}'}/index.mdx, or domains/{'{Domain Name}'}/systems/{'{System Name}'}/services/{'{Service Name}'}/channels/{'{Channel Name}'}/index.mdx file with frontmatter and starter markdown, you can add as much markdown as you want that captures the users input.

If the channel address has dynamic parts, ask me for the parameters and document them in the channel frontmatter.

If the catalog does not have any services, domains, or systems, put it into the root channels folder.

You can use MDX components found here https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/components.md
</PromptBox>

Copy this prompt and paste it into your coding agent. Your agent can help you choose where the channel should live, create the right folder structure, and add the first version of the channel documentation.

### Manual Creation

Channels live in a `/channels` folder. This folder can be placed anywhere in your catalog.

<ProjectTree
  items={[
    {
      name: 'channels',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'inventory.{env}.events',
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
              name: 'channels',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'orders.events',
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

_Here is an example of what a channel markdown file may look like. [You can read the channel reference](/docs/development/guides/resources/messages/message-channels/reference)._

```md title="/channels/inventory.{env}.events/index.mdx (example)"
---
# id of your channel, used for slugs and references in EventCatalog.
# this channel is using dynamic naming using parameters
id: inventory.{env}.events

# Display name of the Channel, rendered in EventCatalog
name: Inventory channel

# Version of the Channel
version: 0.0.1

# Short summary of your Channel
summary: |
  Central event stream for all inventory-related events including stock updates, allocations, and adjustments

# Optional owners, references teams or users
owners:
    - dboyne

# Address of the channel, this example shows a kafka address with parameters, but it can be anything
address: inventory.{env}.events

# optionally document the params for your channel name
# here we know that the channel address "env" value can be "dev,stg,or prod"
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

<!-- Shows channel information on the page including a table of all your params and their values -->
<ChannelInformation />

<!-- Rest of markdown -->

```

---

### Using parameters in channel names

You may have some channel names/addresses that are dynamic. For example `address: inventory.{env}.events`.

The channel `address: inventory.{env}.events` shows us the channel name is dynamic with the given parameter `env`.

In your channel you can document your parameters, give them values, default values and descriptions.

```md
---
# channel markdown file.

# The dynamic address
address: inventory.{env}.events

# optionally document the params for your channel name
# here we know that the channel address "env" value can be "dev,stg,or prod"
parameters:
  env:
    # What values for the parameter? (optional)
    enum:
      - dev
      - stg
      - prod
    # what is the default value (optional)
    default: dev
    # Any examples if you want to list them
    examples: 
      - dev
      - stg
      - prod
    # Describe the channel information (optional)
    description: 'Environment to use'
---
```

Once this information is defined, it can then be rendered on your page using the `<ChannelInformation />` component.

#### Example output using the `<ChannelInformation />` component

![Example](../../../img/channels/channelinformation-example.png)

### Using protocols in channels

Your channel can have one or many protocols. To define a protocol you add the property to your channel.

```md
---
id: inventory.{env}.events

# rest of channel markdown...

# You can define one or many protocols
# list of protocols: https://eventcatalog.dev/docs/development/guides/resources/messages/message-channels/introduction#protocols
protocols:
  - http
  - kafka
  - mqtt
---
```

These protocols will be displayed on your channel page and the visualizer.

You can get [the list of protocols here](/docs/development/guides/resources/messages/message-channels/introduction#protocols).

### Setting a delivery guarantee

You can document the delivery guarantee for your channel using the `deliveryGuarantee` field. This tells consumers what to expect regarding message delivery behavior.

```md
---
id: inventory.{env}.events

# How reliably messages are delivered through this channel
# Accepted values: at-most-once | at-least-once | exactly-once
deliveryGuarantee: at-least-once
---
```

When set, the visualiser shows a colored badge on the channel node. You can read more about the accepted values in the [channel reference](/docs/development/guides/resources/messages/message-channels/reference#deliveryGuarantee).
