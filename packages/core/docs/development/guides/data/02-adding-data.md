---
sidebar_position: 2
keywords:
- EventCatalog domains
sidebar_label: Creating a data store  
title: Creating data stores
description: Creating and managing services within EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.59.0" />

Data stores live in a `/containers` folder. This folder can be placed anywhere in your catalog.

The contents are split into two sections, **frontmatter** and the **markdown content**.

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

Once this file is added, the event will automatically appear across EventCatalog.

## Writing data store content

You can write any Markdown inside a data store.

Each data store gets its own page, so use this space to fully explain how it works.

You can also use [interactive components](/docs/development/components/using-components) to enrich your documentation.

## Assign read/write relationships to data stores

You can assign read/write relationships to data stores in EventCatalog. You can read more about how to do this [here](/docs/development/guides/services/adding-to-services/adding-data-stores-to-services).

## Custom icon

<AddedIn version="3.28.1" />

Set `styles.icon` in your frontmatter to display a custom icon on the data store. The icon appears in the visualiser node, sidebar navigation, page header, and search results.

```md title="/containers/OrdersDatabase/index.mdx (example)"
---
id: orders-db
name: Orders DB
version: 0.0.1
container_type: database
technology: postgres@14
styles:
  icon: /icons/database/postgresql.svg
---
```

The value can be a path to a file in your catalog's `public/` folder (e.g. `/icons/database/postgresql.svg`) or an absolute URL. Drop SVG, PNG, or WEBP files into your catalog's `public/` folder and reference them by path.

### What do data stores look like in EventCatalog?

![Example](../img/containers/data-example.png)

_You can see an example of a data store in the [EventCatalog demo](https://demo.eventcatalog.dev/docs/containers/order-metadata-store/0.0.1)._