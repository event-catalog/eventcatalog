---
sidebar_position: 4
keywords:
- EventCatalog project structure
sidebar_label: Project structure
title: Project structure
description: Understanding how to structure your EventCatalog project
---

import ProjectTree from '@site/src/components/MDX/ProjectTree';

An EventCatalog project is a folder of Markdown files that describe and model your architecture.

You can edit these files directly, or use the optional [EventCatalog Editor](/docs/editor/overview) to create, preview, review, and commit catalog content through a visual workflow.

Each resource in your catalog, such as a domain, service, event, command, query, team, or diagram, is represented by a file or folder in your project. EventCatalog reads those files and turns them into a catalog.

You can also bring your own documentation into EventCatalog, such as architecture decision records, guides, onboarding material, or runbooks. Learn more about [bringing your own documentation](/docs/development/bring-your-own-documentation/introduction).

All resource types are optional. You decide what you want to document, and you can add more resource types later as your catalog becomes more useful to your teams.

## Directories and files

Every EventCatalog project has a few core files used to run and configure the catalog. The resource folders, such as `domains/`, `services/`, `channels/`, and `diagrams/`, are optional and depend on what you want to document.

EventCatalog creates resources from folders that contain an `index.mdx` file. For example, `domains/Orders/index.mdx` creates an `Orders` domain, and `domains/Orders/services/OrderService/index.mdx` creates an `OrderService` service inside that domain.

- `eventcatalog.config.js` - Configures your catalog.
- `package.json` - Defines scripts and dependencies.
- `public/` - Stores static assets that should be served directly.
- `domains/` - Documents business domains and bounded contexts.
- `services/` - Documents services, APIs, applications, external systems, jobs, and workers.
- `events/`, `commands/`, `queries/` - Documents messages.
- `channels/` - Documents topics, queues, streams, webhooks, or other communication paths.
- `diagrams/` - Documents architecture diagrams and flows.
- `teams/` and `users/` - Documents ownership metadata.

### Example project tree

A common EventCatalog project directory might look like this:

<ProjectTree
  items={[
    { name: 'eventcatalog.config.js' },
    { name: 'package.json' },
    {
      name: 'domains',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'Orders',
          type: 'folder',
          defaultOpen: true,
          children: [
            { name: 'index.mdx', highlight: true },
            {
              name: 'services',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'OrderService',
                  type: 'folder',
                  defaultOpen: true,
                  children: [
                    { name: 'index.mdx' },
                    { name: 'openapi.yaml' },
                    { name: 'asyncapi.yaml' },
                    {
                      name: 'events',
                      type: 'folder',
                      defaultOpen: true,
                      children: [
                        {
                          name: 'OrderPlaced',
                          type: 'folder',
                          defaultOpen: true,
                          children: [
                            { name: 'index.mdx' },
                            { name: 'schema.avsc' },
                          ],
                        },
                      ],
                    },
                    {
                      name: 'commands',
                      type: 'folder',
                      defaultOpen: false,
                      children: [
                        {
                          name: 'CancelOrder',
                          type: 'folder',
                          children: [{ name: 'index.mdx' }],
                        },
                      ],
                    },
                    {
                      name: 'queries',
                      type: 'folder',
                      defaultOpen: false,
                      children: [
                        {
                          name: 'GetOrder',
                          type: 'folder',
                          children: [{ name: 'index.mdx' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'channels',
      type: 'folder',
      defaultOpen: false,
      children: [
        {
          name: 'orders.events',
          type: 'folder',
          children: [{ name: 'index.mdx' }],
        },
      ],
    },
    {
      name: 'diagrams',
      type: 'folder',
      defaultOpen: false,
      children: [
        {
          name: 'system-context',
          type: 'folder',
          children: [{ name: 'index.mdx' }],
        },
      ],
    },
    {
      name: 'teams',
      type: 'folder',
      defaultOpen: false,
      children: [{ name: 'mobile-team.mdx' }],
    },
    {
      name: 'users',
      type: 'folder',
      defaultOpen: false,
      children: [{ name: 'dboyne.mdx' }],
    },
    {
      name: 'public',
      type: 'folder',
      defaultOpen: false,
      children: [
        {
          name: 'icons',
          type: 'folder',
          children: [{ name: 'orders.svg' }],
        },
      ],
    },
  ]}
/>

You do not need every folder on day one. Start with the resources you know about, then add more as your catalog grows.

### `domains/`

The `domains/` folder documents the business areas or bounded contexts in your architecture, such as `Orders`, `Payments`, or `Shipping`.

Domains can contain their own documentation, services, messages, diagrams, and other resources. This is the most common way to structure larger catalogs because related architecture stays close together.

Learn more in the [domains guide](/docs/development/guides/domains/introduction).

### `services/`

The `services/` folder documents services, APIs, applications, external systems, jobs, and workers.

Services can live inside a domain, such as `domains/Orders/services/OrderService/`, or at the root of your catalog, such as `services/OrderService/`.

Services often contain OpenAPI, AsyncAPI, or GraphQL specifications and the messages they own.

Learn more in the [services guide](/docs/development/guides/services/introduction).

### `events/`, `commands/`, and `queries/`

The `events/`, `commands/`, and `queries/` folders document messages exchanged between services.

These folders can live inside a service when that service owns the message, or elsewhere in your catalog if you prefer a flatter structure.

Message folders can also contain schemas, examples, and version history.

Learn more in the [messages guide](/docs/development/guides/messages/overview).

### `channels/`

The `channels/` folder documents where messages flow, such as Kafka topics, queues, streams, webhooks, or other integration points.

Use channels when you want to explain the transport layer of your architecture, not just the messages themselves.

Learn more in the [channels guide](/docs/development/guides/channels/introduction).

### `diagrams/`

The `diagrams/` folder documents architecture diagrams, flows, and visual explanations.

Diagrams can live at the root of your catalog or inside another resource, such as a domain or service.

Learn more in the [diagrams guide](/docs/development/guides/diagrams/introduction).

### `teams/` and `users/`

The `teams/` and `users/` folders document ownership metadata.

Teams and users are usually represented as files directly inside their folder:

```bash
teams/
└── mobile-team.mdx

users/
└── dboyne.mdx
```

Use these when you want ownership to be visible across domains, services, messages, schemas, and other resources.

Learn more in the [teams guide](/docs/development/guides/owners/teams/introduction) and [users guide](/docs/development/guides/owners/users/introduction).

### `public/`

The `public/` folder stores static assets that should be served directly, such as icons, images, and files.

For example, if a service icon lives at `public/icons/orders.svg`, you can reference it from your resource metadata using `/icons/orders.svg`.

### `eventcatalog.config.js`

The `eventcatalog.config.js` file configures your catalog, including title, output mode, integrations, and feature settings.

See the [configuration API](/docs/api/config).

### `package.json`

The `package.json` file defines the scripts and dependencies used to run, build, and preview your catalog.

Most EventCatalog projects include scripts such as `npm run dev` and `npm run build`.

## What should I create first?

If you are starting from an empty catalog, create resources in this order:

1. Add a domain for a business area, such as `Orders`.
2. Add one service inside that domain.
3. Add one event, command, or query owned by that service.
4. Add a team that owns the service.
5. Add channels or diagrams once you want to explain how things connect.

That gives you a useful catalog quickly without needing to model everything up front.

## Learn more

- [Domains](/docs/development/guides/domains/introduction)
- [Services](/docs/development/guides/services/introduction)
- [Messages](/docs/development/guides/messages/overview)
- [Channels](/docs/development/guides/channels/introduction)
- [Diagrams](/docs/development/guides/diagrams/introduction)
- [Teams](/docs/development/guides/owners/teams/introduction)
- [Users](/docs/development/guides/owners/users/introduction)
