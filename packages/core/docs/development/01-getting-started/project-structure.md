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

Each resource type in your catalog (e.g domain, system, message) is represented by a file or folder in your project. EventCatalog reads those files and turns them into a catalog.

You can also bring your own documentation into EventCatalog, such as guides, onboarding material, or runbooks. Learn more about [bringing your own documentation](/docs/development/bring-your-own-documentation/introduction).

All resource types are optional. You decide what you want to document, and you can add more resource types later as your catalog becomes more useful to your teams.

## Directories and files

Every EventCatalog project has a few core files used to run and configure the catalog. 

Architecture resources exist in folders such as `domains/`, `systems/`, `services/`, and `events/`. All resources in EventCatalog are optional, it's up to you how you want to model and document your architecture.

EventCatalog creates resources from folders that contain an `index.mdx` file. For example, `domains/Orders/index.mdx` creates an `Orders` domain, `domains/Orders/systems/order-management-system/index.mdx` creates an `order-management-system` system inside that domain, and `domains/Orders/systems/order-management-system/services/OrderService/index.mdx` creates an `OrderService` service inside that system.

- `eventcatalog.config.js` - Configures your catalog.
- `package.json` - Defines scripts and dependencies.
- `public/` - Stores static assets that should be served directly.
- `domains/` - Documents business domains and bounded contexts.
- `systems/` - Documents groups of resources that work together to provide a capability.
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
      defaultOpen: false,
      children: [
        {
          name: 'Orders',
          type: 'folder',
          defaultOpen: false,
          children: [
            { name: 'index.mdx', highlight: true },
            {
              name: 'systems',
              type: 'folder',
              defaultOpen: false,
              children: [
                {
                  name: 'order-management-system',
                  type: 'folder',
                  defaultOpen: false,
                  children: [
                    { name: 'index.mdx', highlight: true },
                    {
                      name: 'services',
                      type: 'folder',
                      defaultOpen: false,
                      children: [
                        {
                          name: 'OrderService',
                          type: 'folder',
                          defaultOpen: false,
                          children: [
                            { name: 'index.mdx' },
                            { name: 'openapi.yaml' },
                            { name: 'asyncapi.yaml' },
                            {
                              name: 'events',
                              type: 'folder',
                              defaultOpen: false,
                              children: [
                                {
                                  name: 'OrderPlaced',
                                  type: 'folder',
                                  defaultOpen: false,
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
                    {
                      name: 'containers',
                      type: 'folder',
                      defaultOpen: false,
                      children: [
                        {
                          name: 'orders-db',
                          type: 'folder',
                          children: [{ name: 'index.mdx' }],
                        },
                      ],
                    },
                    {
                      name: 'flows',
                      type: 'folder',
                      defaultOpen: false,
                      children: [
                        {
                          name: 'order-fulfilment',
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

## What should I create first?

If you want to create your first few resources you can follow our [Learning EventCatalog Guide](/learn).

## Next Steps

Now you know some of the ways EventCatalog work, you can start to document some of your architecture resources.
Here are some links below to help depending on what you want to document.

:::tip Using AI to help
AI is great at helping you document and get going with EventCatalog. You can install our [EventCatalog Skills](https://github.com/event-catalog/eventcatalog-skills) to teach your LLM about EventCatalog, and then ask your LLM to help you get going.
:::

- [Start documenting a business domain](/docs/development/guides/domains/introduction)
- [Start documenting a system](/docs/development/guides/systems/create-system)
- [Start documenting producers and consumers of a service](/docs/development/guides/resources/services/introduction)
