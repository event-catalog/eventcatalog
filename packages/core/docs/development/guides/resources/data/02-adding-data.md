---
sidebar_position: 2
keywords:
- EventCatalog data stores
sidebar_label: Create a data store
title: Create a data store
description: Creating and managing data stores within EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PromptBox from '@site/src/components/MDX/PromptBox';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

<AddedIn version="2.59.0" />

Data stores document the databases, caches, object stores, search indexes, warehouses, and other storage systems used by your architecture.

![Example](../../img/containers/data-example.png)

## Adding a new data store

### Automatic Creation

<PromptBox preview="Create a new EventCatalog data store">
Read https://www.eventcatalog.dev/docs/development/guides/resources/data/adding-data.md and https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/containers.md then help me create a new EventCatalog data store in my catalog.

Ask me for the data store name, what it stores, summary, type, technology, classification, retention, residency, whether it belongs at the root of the catalog or inside a service or system, and any known services or agents that read from or write to it. Then create the correct containers/{'{Data Store Name}'}/index.mdx, services/{'{Service Name}'}/containers/{'{Data Store Name}'}/index.mdx, systems/{'{System Name}'}/containers/{'{Data Store Name}'}/index.mdx, or domains/{'{Domain Name}'}/systems/{'{System Name}'}/containers/{'{Data Store Name}'}/index.mdx file with frontmatter and starter markdown, you can add as much markdown as you want that captures the users input.

If the catalog does not have any services or systems, put it into the root containers folder.

You can use MDX components found here https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/components.md
</PromptBox>

Copy this prompt and paste it into your coding agent. Your agent can help you choose where the data store should live, create the right folder structure, and add the first version of the data store documentation.

### Manual Creation

Data stores live in a `containers` folder. EventCatalog discovers any `index.mdx` file inside a `containers` directory, regardless of where that directory lives in your catalog.

You can place data stores:

At the root of your catalog:

<ProjectTree
  items={[
    {
      name: 'containers',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'OrdersDatabase',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'index.mdx', highlight: true }],
        },
      ],
    },
  ]}
/>

Inside a service:

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
            {
              name: 'containers',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'OrdersDatabase',
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

Inside a system:

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
              name: 'systems',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'order-management-system',
                  type: 'folder',
                  defaultOpen: true,
                  children: [
                    {
                      name: 'containers',
                      type: 'folder',
                      defaultOpen: true,
                      children: [
                        {
                          name: 'OrdersDatabase',
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

The contents are split into two sections, **frontmatter** and the **markdown content**.

## Create the data store file

Create an `index.mdx` file for the data store.

_Here is an example of what a data store markdown file may look like._

```md title="/containers/OrdersDatabase/index.mdx (example)"
---
# id of your data store, used for slugs and references in EventCatalog.
id: orders-db
# Display name of the data store, rendered in EventCatalog.
name: Orders DB
# Version of the data store
version: 0.0.1
# Type of the data store (e.g. database, cache, objectStore, searchIndex)
container_type: database
# Technology of the data store (e.g. postgres@14, redis@7, etc)
technology: postgres@14
# Classification of the data store (e.g. internal, external, etc)
classification: internal
# Retention of the data store (e.g. 7y, 10y, etc)
retention: 7y
# Residency of the data store (e.g. eu-west-1, us-east-1, etc)
residency: eu-west-1
---

## Overview

This orders database stores all orders and order lines for the orders domain.

<NodeGraph />

```

Once this file is added, the data store will automatically appear across EventCatalog.

### Assign read/write relationships to data stores

You can assign read/write relationships to data stores in EventCatalog. You can read more about how to do this in [Add read/write relationships](/docs/development/guides/resources/data/add-read-write-relationships).
