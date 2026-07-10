---
keywords:
- EventCatalog domains
- EventCatalog systems
sidebar_label: What are systems?
title: What are systems?
description: What are systems? Why are they useful in EventCatalog?
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

<AddedIn version="4.0" />

A system is a collection of resources that work together to perform a function.

In EventCatalog, systems help you document software capabilities at a useful operating level. They often sit between domains and the lower-level resources that make up your architecture, but they do not have to belong to a domain.

One way you can think of this:

- **Domains** describe a business boundary or bounded context.
- **Systems** describe a software capability or external system.
- **Resources** describe the things that make up, connect to, or document that system.

For example, a `Shopping` domain might contain a `Cart System` and a `Promotion System`. The `Cart System` is made up of resources (e.g cart state, service (API), and publishes events).

## Why use systems?

Systems help teams document architecture at a useful operating level.

Services, messages, containers, flows, and entities are useful on their own, but larger catalogs can become hard to navigate if every resource sits directly inside a domain. Systems give you a way to group the resources that cooperate to deliver one capability.

Use systems when you want to show:

- The boundary of a product capability or technical system.
- Which services, containers, flows, and entities belong together.
- Which team owns a system.
- Which people or roles interact with the system.
- Which other systems it depends on.
- Whether the system is internal or external.

## How systems relate to other resources

A system can reference:

- [Services](/docs/development/guides/resources/services/introduction)
- [Flows](/docs/development/guides/resources/flows/introduction)
- [Entities](/docs/development/guides/resources/entities/introduction)
- [Data stores](/docs/development/guides/resources/data/introduction)

Contracts such as schemas, OpenAPI specs, AsyncAPI specs, and GraphQL schemas are documented on the messages and services inside the system. This makes the system the entry point for understanding which contracts it implements, consumes, or produces.

Systems can also define:

- **Relationships** to other systems, such as "calculates discounts via" or "sends notifications to".
- **Actors**, such as "Shopper", "Support Agent", or "Warehouse Operator".
- **Scope**, so a system can be marked as `internal` or `external`.

## Systems vs services

A service is an implementation resource. It might be an API, worker, backend service, frontend application, or other deployable component.

A system is a higher-level boundary that can contain one or more services plus the supporting resources that make that function work.

For example:

- `Cart System` is the system.
- `Cart API` is a service inside the system.
- `cart-database` is a container inside the system.
- `CartCheckedOut` is an event produced by the system through one of its services.

## Systems vs domains

A domain is a business boundary. A system is how part of that domain is implemented or operated.

One domain can contain many systems. Each system can then contain the resources that belong to that specific capability.

Systems can also live outside domains when they are shared, external, or not owned by one business boundary.

<ProjectTree
  items={[
    {
      name: 'domains',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'Shopping',
          type: 'folder',
          defaultOpen: true,
          children: [
            { name: 'index.mdx' },
            {
              name: 'systems',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'cart-system',
                  type: 'folder',
                  defaultOpen: true,
                  children: [{ name: 'index.mdx', highlight: true }],
                },
                {
                  name: 'promotion-system',
                  type: 'folder',
                  defaultOpen: true,
                  children: [{ name: 'index.mdx', highlight: true }],
                },
              ],
            },
          ],
        },
      ],
    },
  ]}
/>

This keeps the business model clear while still giving engineering teams a place to document the concrete systems they own and operate.
