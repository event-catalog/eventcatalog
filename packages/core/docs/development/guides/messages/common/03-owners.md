---
keywords:
- EventCatalog
- events 
- owners
sidebar_label: Assigning Owners
title: Adding event owners
description: Adding owners to events with EventCatalog.
---

Owners in EventCatalog are either **users** or **teams** and are **optional**.

To add an owner or a team, you need to add the user or team to the owners field of the event.

## Adding owners using frontmatter

To add owners within an event you need to add them to the `owners` array within your event frontmatter API.

You need to add the `id` of the owner.

```md title="/events/InventoryOutOfStock/index.mdx (example)"
---
id: AdjustInventory
... # other event frontmatter
owners:
    - dboyne # represents a user
    - webTeam # represents a team
---

<!-- Markdown contents... -->

```

Assigning owners to your events can provide others with context of who owns this event and how to contact them.

:::tip Creating users and teams
    EventCatalog gives you the ability to create users and teams. You can read the documentation to get started.
:::


