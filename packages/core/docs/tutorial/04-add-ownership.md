---
sidebar_position: 7
sidebar_label: Add ownership
slug: /tutorial/add-ownership
title: Add ownership
description: Create a team and assign it to your services and event.
---

import ChapterOverview from '@site/src/components/MDX/ChapterOverview';

In this step, you will add ownership to your catalog.

Ownership helps people understand who maintains a service or event, who to ask for help, and who should review changes.

<ChapterOverview
  items={[
    {
      icon: 'folder',
      text: 'Create the Commerce Platform Team.',
    },
    {
      icon: 'server',
      text: 'Assign the team to both services.',
    },
    {
      icon: 'network',
      text: 'Assign the team to OrderPlaced.',
    },
  ]}
/>

### Create the team

Owners in EventCatalog can be [teams](/docs/development/guides/owners/what-are-teams-and-users) or [users](/docs/development/guides/owners/what-are-teams-and-users). For this tutorial, you will create one team: `Commerce Platform Team`.

From the root of your catalog, create a `teams` folder:

```bash
mkdir -p teams
```

Create a new file at `teams/commerce-platform-team.mdx`:

```mdx title="teams/commerce-platform-team.mdx"
---
id: commerce-platform-team
name: Commerce Platform Team
summary: |
  Owns the services and events that support customer ordering.
email: commerce-platform@example.com
---

## Overview

The Commerce Platform Team owns the systems that support customer checkout, ordering, and inventory coordination.
```

The important frontmatter fields are:

- `id` is the stable identifier you will reference from other resources.
- `name` is the label people see in EventCatalog.
- `summary` explains what the team owns.
- `email` gives people a contact path.

You can learn more in the [teams guide](/docs/development/guides/owners/what-are-teams-and-users).

### Assign the services

Open `services/OrderService/index.mdx` and add `owners` to the frontmatter:

```mdx title="services/OrderService/index.mdx"
---
id: OrderService
name: Order Service
version: 0.0.1
summary: |
  Handles customer orders from checkout through to fulfilment.
owners:
  - commerce-platform-team
sends:
  - id: OrderPlaced
    version: 0.0.1
---
```

Now open `services/InventoryService/index.mdx` and add the same owner:

```mdx title="services/InventoryService/index.mdx"
---
id: InventoryService
name: Inventory Service
version: 0.0.1
summary: |
  Tracks stock levels and reserves inventory for customer orders.
owners:
  - commerce-platform-team
receives:
  - id: OrderPlaced
    version: 0.0.1
---
```

The `owners` list references the team `id`, not the display name.

### Assign the event

Open `services/OrderService/events/OrderPlaced/index.mdx` and add the same owner:

```mdx title="services/OrderService/events/OrderPlaced/index.mdx"
---
id: OrderPlaced
name: Order Placed
version: 0.0.1
summary: |
  Raised when a customer places an order.
owners:
  - commerce-platform-team
schemaPath: schema.json
---
```

Assigning owners to events is optional, but useful when the event contract needs a clear team responsible for changes.

You can learn more in the [messages reference](/docs/development/guides/resources/messages/reference#owners) and the [service reference](/docs/development/guides/resources/services/reference#owners).

### Check ownership in EventCatalog

Refresh EventCatalog and open [OrderService](http://localhost:3000/docs/services/OrderService/0.0.1).

You should see `Commerce Platform Team` listed as an owner of the service.

<figure style={{ textAlign: "center" }}>
  <img
    src="/img/tutorial/order-service-owner-page.png"
    alt="Order Service showing Commerce Platform Team as an owner"
    style={{ display: "block", margin: "0 auto" }}
  />
  <figcaption style={{ fontSize: "0.875rem", fontStyle: "italic" }}>
    Order Service shows Commerce Platform Team as the owner.
  </figcaption>
</figure>

Open [OrderPlaced](http://localhost:3000/docs/events/OrderPlaced/0.0.1).

You should see the same team listed as the owner of the event. This tells people who maintains the event contract and who to contact before changing it.

<figure style={{ textAlign: "center" }}>
  <img
    src="/img/tutorial/order-placed-owner-page.png"
    alt="Order Placed event showing Commerce Platform Team as an owner"
    style={{ display: "block", margin: "0 auto" }}
  />
  <figcaption style={{ fontSize: "0.875rem", fontStyle: "italic" }}>
    Order Placed shows its owner alongside its producers and consumers.
  </figcaption>
</figure>

Open [Commerce Platform Team](http://localhost:3000/docs/teams/commerce-platform-team) from the team directory.

The team page gives people a central place to understand who owns this part of the architecture.

<figure style={{ textAlign: "center" }}>
  <img
    src="/img/tutorial/commerce-platform-team-page.png"
    alt="Commerce Platform Team page showing owned services and messages"
    style={{ display: "block", margin: "0 auto" }}
  />
  <figcaption style={{ fontSize: "0.875rem", fontStyle: "italic" }}>
    The team page lists the services and messages owned by Commerce Platform Team.
  </figcaption>
</figure>

### What you have now

Your catalog now has a first ownership model:

- a team page
- owned services
- an owned event
- a clear contact path for the team

### Next

Continue to [Create a domain](/docs/tutorial/create-a-domain).
