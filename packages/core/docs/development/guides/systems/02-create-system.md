---
sidebar_position: 2
keywords:
- EventCatalog systems
sidebar_label: Create a system
title: Create a system
description: Create a system in EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PromptBox from '@site/src/components/MDX/PromptBox';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

<AddedIn version="4.0" />

A system is a collection of resources that work together to perform a function.

Use a system when you want to document a group of resources that work together to perform one function.

![Example system page in EventCatalog](./img/create-system-example.png)

## Creating a system

### Automatic Creation

<PromptBox preview="Create a new EventCatalog system">
Read https://www.eventcatalog.dev/docs/development/guides/systems/create-system.md and https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/systems.md then help me create a new EventCatalog system in my catalog.

Ask me for the system name, what function it performs, whether it is internal or external, and whether it belongs inside a domain. Then create the correct systems/{'{System Name}'}/index.mdx or domains/{'{Domain Name}'}/systems/{'{System Name}'}/index.mdx file with frontmatter and starter markdown, you can add as much markdown as you want that captures the users input.

You can use MDX components found here https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/components.md
</PromptBox>

Copy this prompt and paste it into your coding agent. Your agent can help you choose where the system should live, create the right folder structure, and add the first version of the system documentation.

### Manual Creation

Systems can live inside a domain or at the root of your catalog.

If the system clearly belongs to one domain, keep it inside that domain and [attach the domain to that system](/docs/development/guides/domains/add-resources-to-domains/add-systems-to-domains).

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

If the system is shared, external, or you want to attach it to domains later, create it at the root:

<ProjectTree
  items={[
    {
      name: 'systems',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'stripe',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'index.mdx', highlight: true }],
        },
      ],
    },
  ]}
/>

Most teams start by keeping systems inside the domain they belong to.

## Create the system file

Create an `index.mdx` file for the system.

```md title="/domains/Shopping/systems/cart-system/index.mdx"
---
id: cart-system
# freindly name of the system
name: Cart System
version: 1.0.0
# summary of the system
summary: |
  Internal system that owns the customer's shopping cart and checkout flow.
# is the system internal to your organization or external
scope: internal
# who owns this system in your organization?
owners:
  - shopping-platform
---

## Overview

The Cart System owns the shopping cart. It accepts commands to add and remove items, persists cart contents in the cart database, asks the Promotion System to calculate discounts, and publishes an event when a cart is checked out.
```

## Next steps

- [Add resources to the system](/docs/development/guides/systems/add-resources-to-systems)
- [Model relationships and actors](/docs/development/guides/systems/model-relationships-and-actors)
- [Add systems to domains](/docs/development/guides/domains/add-resources-to-domains/add-systems-to-domains)
- [Visualize systems with context maps](/docs/development/guides/systems/system-context-maps)
- [Review the systems reference](/docs/development/guides/systems/reference)
