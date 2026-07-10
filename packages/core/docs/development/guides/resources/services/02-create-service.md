---
sidebar_position: 2
keywords:
- EventCatalog domains
sidebar_label: Create a service
title: Create a service
description: Creating and managing services within EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PromptBox from '@site/src/components/MDX/PromptBox';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

A service is an implementation resource. It might be an API, worker, backend service, frontend application, or other deployable component.

![Example](../../img/services/service-example.png)

## Adding a new service

### Automatic Creation

<PromptBox preview="Create a new EventCatalog service">
Read https://www.eventcatalog.dev/docs/development/guides/resources/services/create-service.md and https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/services.md then help me create a new EventCatalog service in my catalog.

Ask me for the service name, what it does, summary, whether it belongs inside a domain or system, and any known messages, or specifications. Then create the correct services/{'{Service Name}'}/index.mdx, domains/{'{Domain Name}'}/services/{'{Service Name}'}/index.mdx, systems/{'{System Name}'}/services/{'{Service Name}'}/index.mdx, or domains/{'{Domain Name}'}/systems/{'{System Name}'}/services/{'{Service Name}'}/index.mdx file with frontmatter and starter markdown, you can add as much markdown as you want that captures the users input.

If the catalog does not have any domains, or systems, just assume and put it into the root of the catalog, no need to ask about systems or domains.

You can use MDX components found here https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/components.md
</PromptBox>

Copy this prompt and paste it into your coding agent. Your agent can help you choose where the service should live, create the right folder structure, and add the first version of the service documentation.

### Manual Creation

Services can live at the root of your catalog, inside a domain, inside a system, or inside a system that belongs to a domain.

Create a new folder for the service with an `index.mdx` file.

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
          children: [{ name: 'index.mdx', highlight: true }],
        },
      ],
    },
  ]}
/>

If the service belongs to a domain, keep it inside that domain:

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
              name: 'services',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'OrdersService',
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

Services can also live inside systems:

<ProjectTree
  items={[
    {
      name: 'domains',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'Shopping',
          type: 'folder',
          defaultOpen: true,
          children: [
            {
              name: 'systems',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'cart-system',
                  type: 'folder',
                  defaultOpen: true,
                  children: [
                    {
                      name: 'services',
                      type: 'folder',
                      defaultOpen: true,
                      children: [
                        {
                          name: 'CartAPI',
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
          ],
        },
      ],
    },
  ]}
/>

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
