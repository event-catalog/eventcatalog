---
sidebar_position: 11
sidebar_label: Next steps
title: Next steps
description: Grow your catalog beyond the tutorial.
---

import ChapterOverview from '@site/src/components/MDX/ChapterOverview';

Congratulations, you have created your first EventCatalog.

This is a real catalog now. It models architecture primitives, links them together, and gives people a place to understand how part of your system works.

<ChapterOverview
  title="Your catalog now has..."
  description="The first pieces of a useful architecture catalog"
  items={[
    {
      icon: 'server',
      text: 'Services that describe the systems in your architecture.',
    },
    {
      icon: 'network',
      text: 'An event with producer and consumer relationships.',
    },
    {
      icon: 'code',
      text: 'A schema that explains the event payload.',
    },
    {
      icon: 'folder',
      text: 'Ownership and a domain to group the work.',
    },
    {
      icon: 'eye',
      text: 'Visualizations and a production build path.',
    },
  ]}
/>

This is enough to give people a useful first view of your architecture. From here, you can keep adding detail in the way that fits your team.

### See a fuller catalog

The tutorial catalog is small on purpose. EventCatalog can model many more architecture primitives, including [services](/docs/development/guides/resources/services/introduction), [events](/docs/development/guides/resources/messages/message-types/events), [commands](/docs/development/guides/resources/messages/message-types/commands), [queries](/docs/development/guides/resources/messages/message-types/queries), [channels](/docs/development/guides/resources/messages/message-channels/introduction), [data stores](/docs/development/guides/resources/data/introduction), [data products](/docs/development/guides/resources/data-products/introduction), [agents](/docs/development/guides/resources/agents/introduction), [owners](/docs/development/guides/owners/what-are-teams-and-users), [domains](/docs/development/guides/domains/introduction), [flows](/docs/development/guides/resources/flows/introduction), and the relationships between them.

You can explore the public [EventCatalog demo catalog](https://demo.eventcatalog.dev/) to see a larger example.

<figure style={{ textAlign: "center" }}>
  <img
    src="/img/tutorial/demo-catalog-orders-service-visualizer.png"
    alt="The EventCatalog demo visualizer showing a larger Orders Service architecture"
    style={{ display: "block", margin: "0 auto" }}
  />
  <figcaption style={{ fontSize: "0.875rem", fontStyle: "italic" }}>
    The demo catalog visualizer shows services, events, channels, data stores, agents, and workflows connected together.
  </figcaption>
</figure>

[Open this view in the demo catalog](https://demo.eventcatalog.dev/visualiser/services/OrdersService/0.0.3).

### Add more documentation

Every resource page is Markdown and MDX. You can add more explanation, diagrams, links, runbooks, examples, or any other content that helps people understand the system.

Useful docs:

- [Using components](/docs/development/components/using-components)
- [Custom components](/docs/development/components/custom-components/introduction)
- [Resource references](/docs/development/components/resource-references)
- [Bring your own documentation](/docs/development/bring-your-own-documentation/custom-pages/adding-custom-docs)

### Edit visually with EventCatalog Editor

If you prefer a visual local editor, try [EventCatalog Editor](/docs/editor/overview). It runs locally and gives you a UI for editing the catalog files in your project.

### Automate from existing specifications

You do not have to maintain everything by hand. EventCatalog can generate catalog resources from specifications and registries.

Useful plugin docs:

- [OpenAPI plugin](/docs/plugins/openapi/intro)
- [AsyncAPI plugin](/docs/plugins/asyncapi/intro)
- [Confluent Schema Registry plugin](/docs/plugins/confluent-schema-registry/intro)
- [GitHub plugin](/docs/plugins/github/intro)

### Model more architecture primitives

The tutorial focused on services, events, schemas, owners, and domains. EventCatalog can model more of your architecture as your catalog grows.

Use these docs when you are ready to add more primitives to your catalog:

- [Domains](/docs/development/guides/domains/introduction)
- [Services](/docs/development/guides/resources/services/introduction)
- [Events](/docs/development/guides/resources/messages/message-types/events)
- [Commands](/docs/development/guides/resources/messages/message-types/commands)
- [Queries](/docs/development/guides/resources/messages/message-types/queries)
- [Channels](/docs/development/guides/resources/messages/message-channels/introduction)
- [Data stores](/docs/development/guides/resources/data/introduction)
- [Data products](/docs/development/guides/resources/data-products/introduction)
- [Agents](/docs/development/guides/resources/agents/introduction)
- [Flows](/docs/development/guides/resources/flows/add-flows-to-resources)
- [Owners](/docs/development/guides/owners/what-are-teams-and-users)

### Keep improving the catalog

Start small, keep the content close to the systems it describes, and add more detail when people ask questions the catalog cannot answer yet.
