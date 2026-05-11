---
sidebar_position: 8
keywords:
- EventCatalog
- services 
- owners
sidebar_label: Owners
title: Adding service owners
description: Adding owners to services with EventCatalog.
---

Owners in EventCatalog are either **users** or **teams** and are **optional**.

To add an owner or a team, you need to add the user or team to the owners field of the service.

## Adding owners using frontmatter

To add owners within a service you need to add them to the `owners` array within your service frontmatter API.

You need to add the `id` of the owner.

```md title="/services/OrderService/index.mdx (example)"
---
id: OrderService
... # other service frontmatter
owners:
    - dboyne # represents a user
    - webTeam # represents a team
---

<!-- Markdown contents... -->

```

Assigning owners to your services can provide others with context of who owns this service and how to contact them.

:::tip Creating users and teams
    EventCatalog gives you the ability to create users and teams. You can read the documentation to get started.
:::


