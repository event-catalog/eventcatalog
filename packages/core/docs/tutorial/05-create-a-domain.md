---
sidebar_position: 8
sidebar_label: Create a domain
slug: /tutorial/create-a-domain
title: Create a domain
description: Group the tutorial services into a domain.
---

import ChapterOverview from '@site/src/components/MDX/ChapterOverview';

In this step, you will create your first domain.

A [domain](/docs/development/guides/domains/introduction) groups related parts of your architecture around a business area. In this tutorial, you will create an `E-Commerce` domain and add the two services you already created.

<ChapterOverview
  items={[
    {
      icon: 'folder',
      text: 'Create an E-Commerce domain folder.',
    },
    {
      icon: 'server',
      text: 'Add OrderService and InventoryService to the domain.',
    },
    {
      icon: 'eye',
      text: 'Refresh EventCatalog and check the domain page.',
    },
  ]}
/>

### Create the domain folder

From the root of your catalog, create a folder for the domain:

```bash
mkdir -p domains/E-Commerce
```

### Add the domain page

Create a new file at `domains/E-Commerce/index.mdx`:

```mdx title="domains/E-Commerce/index.mdx"
---
id: E-Commerce
name: E-Commerce
version: 0.0.1
summary: |
  Contains the services that support customer ordering.
owners:
  - commerce-platform-team
services:
  - id: OrderService
    version: 0.0.1
  - id: InventoryService
    version: 0.0.1
---

## Overview

The E-Commerce domain contains the services that support checkout, orders, and inventory coordination.
```

The important frontmatter fields are:

- `id` is the stable identifier for the domain.
- `name` is the label people see in EventCatalog.
- `version` is the version of the domain page.
- `summary` explains what belongs in the domain.
- `owners` links the domain to the team that owns it.
- `services` lists the services that belong to the domain.

You can learn more in the [create a domain guide](/docs/development/guides/domains/create-domain), [add services to domains guide](/docs/development/guides/domains/add-resources-to-domains/add-services-to-domains), and [domain owners guide](/docs/development/guides/domains/ownership-and-language/owners).

The `version` field inside each service reference is optional. If you leave it out, EventCatalog will use the latest version of that service.

### Check the domain in EventCatalog

Refresh EventCatalog in your browser and open the `E-Commerce` domain.

You should see the domain page and the two services listed in the sidebar at [http://localhost:3000/docs/domains/E-Commerce/0.0.1](http://localhost:3000/docs/domains/E-Commerce/0.0.1)

<figure style={{ textAlign: "center" }}>
  <img
    src="/img/tutorial/e-commerce-domain-page.png"
    alt="E-Commerce domain page showing Order Service and Inventory Service"
    style={{ display: "block", margin: "0 auto" }}
  />
  <figcaption style={{ fontSize: "0.875rem", fontStyle: "italic" }}>
    The E-Commerce domain groups Order Service and Inventory Service.
  </figcaption>
</figure>

### Check the domain map

Open the `Map` view from the domain page.

EventCatalog shows the services that belong to the domain. Because those services already publish and consume `OrderPlaced`, the map also shows that relationship. You still only added services to the domain.

<figure style={{ textAlign: "center" }}>
  <img
    src="/img/tutorial/e-commerce-domain-map.png"
    alt="E-Commerce domain map showing Order Service and Inventory Service"
    style={{ display: "block", margin: "0 auto" }}
  />
  <figcaption style={{ fontSize: "0.875rem", fontStyle: "italic" }}>
    The E-Commerce domain map shows the services in the domain and the event relationship between them.
  </figcaption>
</figure>

:::tip Show the domain map on the page
You can also embed the domain visualization directly into the domain documentation page with the [`NodeGraph`](/docs/development/components/components/nodegraph) component:

```mdx
<NodeGraph />
```
:::

### What you have now

Your catalog now has:

- two services
- one event
- a schema
- producer and consumer relationships
- ownership
- an `E-Commerce` domain that groups the services

### Next

Continue to [Visualize your catalog](/docs/tutorial/visualize-your-catalog).
