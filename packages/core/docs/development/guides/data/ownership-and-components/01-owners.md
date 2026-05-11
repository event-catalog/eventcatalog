---
sidebar_position: 5
keywords:
- EventCatalog
- services 
- owners
sidebar_label: Owners
title: Adding data store owners
description: Adding owners to data stores with EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.59.0" />

Owners in EventCatalog are either **users** or **teams** and are **optional**.

To add an owner or a team, you need to add the user or team to the owners field of the data store.

## Adding owners using frontmatter

To add owners within a data store you need to add them to the `owners` array within your data store frontmatter API.

You need to add the `id` of the owner.

```md title="/services/OrderService/containers/OrderDatabase/index.mdx (example)"
---
id: OrderDatabase
... # other data store frontmatter
owners:
    - dboyne # represents a user
    - webTeam # represents a team
---

<!-- Markdown contents... -->

```

Assigning owners to your data stores can provide others with context of who owns this data store and how to contact them.

:::tip Creating users and teams
    EventCatalog gives you the ability to create users and teams. You can [read the documentation to get started](/docs/owners).
:::


