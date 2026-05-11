---
keywords:
- EventCatalog domains
sidebar_label: Adding entities to domains
title: Adding entities to domains
description: Creating and managing entities within EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.36.0" />

Once you have [created your entities](/docs/development/guides/domains/entities/adding-entities) you can add them to your domains.

To add an entity to a domain you need to add the entity to the `entities` array in the domain's markdown file.

```mdx title="/domains/Orders/index.mdx"

---
id: OrderItem
name: OrderItem
version: 1.0.0
entities:
  - id: OrderItem
    version: 1.0.0
---

Your domain markdown...

```