---
keywords:
- EventCatalog entities
- Entity resources
sidebar_position: 4
sidebar_label: Add entities to resources
title: Add entities to resources
description: Add entities to domains, systems, and services in EventCatalog.
---

import ProjectTree from '@site/src/components/MDX/ProjectTree';

Adding [entities](/docs/development/guides/resources/entities/introduction) to resources helps people understand which business concepts a domain, system, or service owns, uses, or documents.

In EventCatalog, entities can be connected to:

- [Domains](/docs/development/guides/domains/introduction)
- [Systems](/docs/development/guides/systems/introduction)
- [Services](/docs/development/guides/resources/services/introduction)

## Add entities using frontmatter

Add entities to a resource using the `entities` array in the resource frontmatter.

```md title="/domains/Ordering/index.mdx"
---
id: ordering
name: Ordering
version: 1.0.0
# define entities that belong to this domain
entities:
  - id: order
    version: 1.0.0
  - id: customer
---
```

You can use the same pattern for systems:

```md title="/domains/Ordering/systems/order-management/index.mdx"
---
id: order-management
name: Order Management
version: 1.0.0
# define entities that are part of this system
entities:
  - id: order
  - id: shipment
---
```

And services:

```md title="/services/OrderService/index.mdx"
---
id: order-service
name: Order Service
version: 1.0.0
# define entities this service owns, reads, writes, or exposes
entities:
  - id: order
  - id: customer
---
```

The `version` is optional. If no version is given, EventCatalog uses the latest version of the referenced entity.

## Keep entities inside the resource folder

You can also define entities inside a resource folder to keep related business model documentation together.

<ProjectTree
  items={[
    {
      name: 'domains',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'Ordering',
          type: 'folder',
          defaultOpen: true,
          children: [
            { name: 'index.mdx' },
            {
              name: 'entities',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'Order',
                  type: 'folder',
                  defaultOpen: true,
                  children: [{ name: 'index.mdx', highlight: true }],
                },
                {
                  name: 'Customer',
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

This structure makes the domain the entry point for the entities that belong to that business boundary.

Entities can also live inside services:

<ProjectTree
  items={[
    {
      name: 'services',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'OrderService',
          type: 'folder',
          defaultOpen: true,
          children: [
            { name: 'index.mdx' },
            {
              name: 'entities',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'Order',
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

This structure is useful when the entity is owned by, exposed by, or tightly coupled to one service.

## Keep shared entities at the root

Entities can live at the root of the catalog when they are shared across multiple domains, systems, or services.

<ProjectTree
  items={[
    {
      name: 'entities',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'Customer',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'index.mdx', highlight: true }],
        },
        {
          name: 'Payment',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'index.mdx', highlight: true }],
        },
      ],
    },
  ]}
/>

Use frontmatter when the entity is shared across multiple resources. Keep the entity inside a resource folder when the entity is owned by that resource and should move with it.

## Show entities on resource pages

When a domain, service, or system references entities, EventCatalog shows that relationship on the resource page.

Domains and services can also show entity maps, which help people understand the entity relationships inside that part of your architecture.

Learn more in [entity maps](/docs/development/guides/resources/entities/entity-maps) and [model entity relationships](/docs/development/guides/resources/entities/model-entity-relationships).

For the complete list of supported fields, see the [entities reference](/docs/development/guides/resources/entities/reference).
