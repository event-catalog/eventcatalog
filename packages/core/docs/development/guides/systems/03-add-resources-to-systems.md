---
sidebar_position: 3
keywords:
- EventCatalog systems
- system resources
sidebar_label: Add resources to systems
title: Add resources to systems
description: Add services, flows, entities, and data stores to systems.
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

<AddedIn version="4.0" />

In EventCatalog, systems can directly reference:

- [Services](/docs/development/guides/resources/services/introduction)
- [Flows](/docs/development/guides/resources/flows/introduction)
- [Entities](/docs/development/guides/resources/entities/introduction)
- [Data stores](/docs/development/guides/resources/data/introduction)

Messages, APIs, schemas, and channels are usually documented through the services and messages inside the system.

## Add resources using frontmatter

Add resources to the system frontmatter using `services`, `flows`, `entities`, and `containers`.

```md title="/domains/Shopping/systems/cart-system/index.mdx"
---
id: cart-system
name: Cart System
version: 1.0.0
# define services in this system
services:
  - id: cart-api
    version: 1.0.0
# define databases in this system    
containers:
  - id: cart-database
    version: 1.0.0
# define documented business workflows part of this system
flows:
  - id: checkout-flow
    version: 1.0.0
# define any entities that belong to this system
entities:
  - id: cart
    version: 1.0.0
---
```

The `version` is optional. If no version is given, EventCatalog uses the latest version of the referenced resource.

## Keep resources inside the system folder

You can also define resources inside the system folder to keep related architecture documentation together.

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
                    { name: 'index.mdx', highlight: true },
                    {
                      name: 'services',
                      type: 'folder',
                      defaultOpen: false,
                      highlight: true,
                      children: [
                        {
                          name: 'CartAPI',
                          type: 'folder',
                          defaultOpen: true,
                          children: [{ name: 'index.mdx' }],
                        },
                      ],
                    },
                    {
                      name: 'containers',
                      type: 'folder',
                      defaultOpen: false,
                      highlight: true,
                      children: [
                        {
                          name: 'cart-database',
                          type: 'folder',
                          defaultOpen: true,
                          children: [{ name: 'index.mdx' }],
                        },
                      ],
                    },
                    {
                      name: 'flows',
                      type: 'folder',
                      defaultOpen: false,
                      highlight: true,
                      children: [
                        {
                          name: 'CheckoutFlow',
                          type: 'folder',
                          defaultOpen: true,
                          children: [{ name: 'index.mdx' }],
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

This structure makes the system the entry point for the resources that make up that capability.

## Show the resource diagram

Add `<NodeGraph />` to the system page to show the resources inside the system.



```md title="/domains/Shopping/systems/cart-system/index.mdx"
## Resource Diagram

<NodeGraph />
```

![Product Catalog System resource diagram](./img/product-catalog-system-resource-map.png)

You can also open the resource diagram directly:

```txt
/visualiser/systems/{system-id}/{version}
```

For the complete list of supported fields, see the [systems reference](/docs/development/guides/systems/reference).
