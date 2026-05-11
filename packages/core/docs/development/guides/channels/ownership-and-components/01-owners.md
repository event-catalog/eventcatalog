---
keywords:
- EventCatalog
- channels 
- owners
sidebar_label: Owners
title: Adding channel owners
description: Adding owners to channels with EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.13.0" />

Owners in EventCatalog are either **users** or **teams** and are **optional**.

To add an owner or a team, you need to add the user or team to the owners field of the channel.

## Adding owners using frontmatter

To add owners within a channel you need to add them to the `owners` array within your channel frontmatter API.

You need to add the `id` of the owner.

```md title="/channels/OrderChannel/index.mdx (example)"
---
id: OrderChannel
... # other channel frontmatter
owners:
    - dboyne # represents a user
    - webTeam # represents a team
---

<!-- Markdown contents... -->

```

Assigning owners to your channels can provide others with context of who owns this channel and how to contact them.

:::tip Creating users and teams
    EventCatalog gives you the ability to create users and teams. You can read the documentation to get started.
:::


