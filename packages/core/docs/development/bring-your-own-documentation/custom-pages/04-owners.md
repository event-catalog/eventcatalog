---
sidebar_position: 4
keywords:
- EventCatalog
- channels 
- owners
sidebar_label: Owners
title: Adding custom page owners
description: Adding owners to custom pages with EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.33.0" />

Owners in EventCatalog are either **users** or **teams** and are **optional**.

To add an owner or a team, you need to add the user or team to the owners field of the custom page.

## Adding owners using frontmatter

To add owners within a custom page you need to add them to the `owners` array within your custom page frontmatter API.

You need to add the `id` of the owner.

```md title="/docs/guides/creating-a-new-producer/index.mdx (example)"
---
id: OrderChannel
... # other custom page frontmatter
owners:
    - dboyne # represents a user
    - webTeam # represents a team
---

<!-- Markdown contents... -->

```

Assigning owners to your custom pages can provide others with context of who owns this custom page and how to contact them.

:::tip Creating users and teams
    EventCatalog gives you the ability to create users and teams. You can read the documentation to get started.
:::


