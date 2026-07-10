---
sidebar_position: 9
sidebar_label: Visualize your catalog
title: Visualize your catalog
description: Use EventCatalog visualizations to inspect the tutorial architecture.
---

import ChapterOverview from '@site/src/components/MDX/ChapterOverview';

In this step, you will use EventCatalog visualizations to understand the model you created.

Visualizations help people see how systems connect. They grow as your catalog grows, so the same view can start with one event relationship and later include domains, commands, queries, flows, channels, data stores, agents, and other architecture primitives.

<ChapterOverview
  items={[
    {
      icon: 'network',
      text: 'Use NodeGraph inside documentation pages.',
    },
    {
      icon: 'eye',
      text: 'Use the Visualizer to explore the catalog map.',
    },
    {
      icon: 'code',
      text: 'Export visualizations to Mermaid when you need to share or edit them elsewhere.',
    },
  ]}
/>

### Use NodeGraph on a page

The [`NodeGraph`](/docs/development/components/components/nodegraph) component can be added to domain, service, message, changelog, and custom documentation pages.

Add it to a resource page like this:

```mdx
<NodeGraph />
```

When used without props, `NodeGraph` renders a visualization for the current page. For example, on the `OrderPlaced` page it can show the event, the service that publishes it, and the service that consumes it.

You can also render a graph for a specific resource:

```mdx
<NodeGraph id="E-Commerce" version="0.0.1" type="domain" />
```

This is useful when you want the visualization to appear directly next to the documentation people are reading.

### Use the Visualizer

The Visualizer is the full map view in EventCatalog. It gives you more room to explore how resources connect across your catalog.

Open the `OrderPlaced` map from the event page. You should see:

- `OrderService` publishes `OrderPlaced`.
- `InventoryService` consumes `OrderPlaced`.
- the relationship between the producer, event, and consumer.

<figure style={{ textAlign: "center" }}>
  <img
    src="/img/tutorial/order-placed-producer-consumer-map.png"
    alt="The OrderPlaced visualizer map showing OrderService as producer and InventoryService as consumer"
    style={{ display: "block", margin: "0 auto" }}
  />
  <figcaption style={{ fontSize: "0.875rem", fontStyle: "italic" }}>
    The OrderPlaced map shows the producer, event, and consumer relationship.
  </figcaption>
</figure>

Now open the `E-Commerce` domain map. The domain only references the services, but the map can still show the event relationship between them.

<figure style={{ textAlign: "center" }}>
  <img
    src="/img/tutorial/e-commerce-domain-map.png"
    alt="The E-Commerce domain visualizer map showing services and their event relationship"
    style={{ display: "block", margin: "0 auto" }}
  />
  <figcaption style={{ fontSize: "0.875rem", fontStyle: "italic" }}>
    The E-Commerce domain map gives a focused view of the services in that part of the architecture.
  </figcaption>
</figure>

### Export to Mermaid

NodeGraph visualizations can be switched to Mermaid view or copied as Mermaid diagram code. This is useful when you want to share the architecture with another tool, paste it into documentation, or give it to an AI assistant for review.

You can learn more in the [NodeGraph docs](/docs/development/components/components/nodegraph#export-as-mermaid) and the [Mermaid docs](/docs/development/components/diagram-syntax/mermaid#export-nodegraphs-as-mermaid).

### What you have now

You can use EventCatalog to:

- embed visualizations directly inside documentation pages
- explore the wider catalog with the Visualizer
- see events between systems
- understand how services, domains, ownership, and messages connect
- export visualizations as Mermaid when you need to use them elsewhere

As you add more resources, these visualizations become more useful. Commands, queries, domains, flows, channels, data stores, agents, and extra services can all add more context to the map.

### Next

Continue to [Build and deploy your catalog](/docs/tutorial/build-your-catalog).
