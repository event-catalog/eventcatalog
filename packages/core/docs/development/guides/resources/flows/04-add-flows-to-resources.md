---
keywords:
- EventCatalog flows
sidebar_position: 4
sidebar_label: Add flows to resources
title: Add flows to resources
description: Associate flows with domains, services, and systems in EventCatalog.
---

import ProjectTree from '@site/src/components/MDX/ProjectTree';

Adding [flows](/docs/development/guides/resources/flows/introduction) to resources helps people understand where a business process belongs and which parts of the architecture participate in it.

In EventCatalog, flows can be connected to:

- [Domains](/docs/development/guides/domains/introduction)
- [Systems](/docs/development/guides/systems/introduction)
- [Services](/docs/development/guides/resources/services/introduction)

## Add flows using frontmatter

Add flows to a resource using the `flows` array in the resource frontmatter.

```md title="/services/Orders/index.mdx"
---
id: OrdersService
name: Orders Service
version: 1.0.0
# define flows this service participates in
flows:
  - id: OrderProcessing
    version: 1.0.0
  - id: PaymentFlow
---
```

You can use the same pattern for domains:

```md title="/domains/Orders/index.mdx"
---
id: OrdersDomain
name: Orders
version: 1.0.0
# define flows that belong to this domain
flows:
  - id: OrderProcessing
    version: 1.0.0
---
```

And systems:

```md title="/domains/Orders/systems/order-management/index.mdx"
---
id: order-management
name: Order Management
version: 1.0.0
# define flows that are part of this system
flows:
  - id: OrderProcessing
    version: 1.0.0
---
```

The `version` is optional. If no version is given, EventCatalog uses the latest version of the referenced flow.

## Keep flows inside the resource folder

You can also define flows inside a resource folder to keep related process documentation together.

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
            { name: 'index.mdx' },
            {
              name: 'flows',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'OrderProcessing',
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

This structure makes the domain the entry point for the flows that belong to that business area.

Flows can also live inside services:

<ProjectTree
  items={[
    {
      name: 'services',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'OrdersService',
          type: 'folder',
          defaultOpen: true,
          children: [
            { name: 'index.mdx' },
            {
              name: 'flows',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'OrderProcessing',
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

This structure is useful when the flow is specific to one service.

## Show flows on resource pages

When a domain, service, or system references a flow, EventCatalog shows that relationship on the resource page and in the visualizer.

Use frontmatter when the flow is shared across multiple resources. Keep the flow inside a resource folder when the flow is owned by that resource and should move with it.

For the complete list of supported fields, see the [flows reference](/docs/development/guides/resources/flows/reference).
