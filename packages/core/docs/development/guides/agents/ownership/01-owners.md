---
sidebar_position: 1
keywords:
- EventCatalog
- agents
- owners
sidebar_label: Owners
title: Adding agent owners
description: Adding owners to agents with EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.41.0" />

Owners in EventCatalog are either **users** or **teams** and are optional. Assigning owners to an agent makes it clear who is responsible for keeping it up to date, responding to incidents, and approving model upgrades.

## Add owners using frontmatter

Add the `id` of any user or team to the `owners` array in your agent's frontmatter:

```md title="/agents/FraudReviewAgent/index.mdx (example)"
---
id: FraudReviewAgent
version: 0.0.1
owners:
  - dboyne      # a user id
  - full-stack  # a team id
---
```

:::tip Creating users and teams
EventCatalog gives you the ability to create users and teams. You can read the documentation to get started.
:::

## Show owned agents on a team page

<AddedIn version="3.41.0" />

Teams and users gained an `ownedAgents` array alongside `ownedServices`. Add agent references to a team file to surface owned agents directly on the team's catalog page.

```md title="/teams/full-stack.mdx (example)"
---
id: full-stack
name: Full Stack Team
ownedAgents:
  - id: FraudReviewAgent
    version: 0.0.1
  - id: OrderSupportAgent
ownedServices:
  - id: PaymentService
    version: 0.0.1
---
```

The same field is available on user files:

```md title="/users/dboyne.mdx (example)"
---
id: dboyne
name: David Boyne
ownedAgents:
  - id: InventoryRebalancingAgent
---
```

If no `version` is provided, EventCatalog uses the latest version of the agent.
