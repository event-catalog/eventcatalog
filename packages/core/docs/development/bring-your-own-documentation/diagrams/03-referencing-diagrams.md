---
sidebar_position: 3
keywords:
- EventCatalog diagrams
- Referencing diagrams
sidebar_label: Add diagrams to resources
title: Add diagrams to resources
description: How to link diagrams to domains, services, messages, and other resources
---

You can assign your diagrams to resources in EventCatalog.

When you reference a diagram from a resource, EventCatalog automatically:

- Adds the diagram to the resource's sidebar under a "Diagrams" section
- Creates a clickable link to the full diagram page
- Shows the diagram name and summary in the sidebar

<div className="flex justify-center">
  <img src="/img/diagram-sidebar.png" alt="Diagram references" className="rounded-lg" style={{ width: '20%', height: 'auto' }} />
</div>

## Referencing diagrams in frontmatter

To reference diagrams from any resource, use the `diagrams` field in the frontmatter:

```yaml
diagrams:
  - id: diagram-id
    # version is optional and defaults to latest if not specified
    version: 1.0.0
```

The `version` field is optional and defaults to `latest` if not specified.

## Examples

### Referencing diagrams from a domain

Domain-level diagrams often show the overall architecture, domain boundaries, or integration patterns.

```md title="/domains/E-Commerce/index.mdx"
---
id: E-Commerce
name: E-Commerce Domain
version: 1.0.0
summary: Core business domain for our e-commerce platform
diagrams:
  - id: target-architecture
    version: 1.0.0
  - id: order-flow
    version: 1.0.0
---

## Overview

The E-Commerce domain handles all order processing...
```

When users view the E-Commerce domain, they'll see a "Diagrams" section in the sidebar with links to both the "Target Architecture" and "Order Flow" diagrams.

### Referencing diagrams from a service

Service-level diagrams typically show API flows, service interactions, or internal component architecture.

```md title="/services/OrderService/index.mdx"
---
id: OrderService
name: Order Service
version: 2.0.0
summary: Manages order lifecycle and orchestration
diagrams:
  - id: order-api-flow
    version: 2.0.0
  - id: order-state-machine
    version: 1.0.0
---

## Overview

The Order Service is responsible for...
```

### Referencing diagrams from a message

Message-level diagrams can show sequence flows, event propagation, or payload structures.

```md title="/events/OrderCreated/index.mdx"
---
id: OrderCreated
name: Order Created
version: 1.0.0
summary: Published when a new order is created
diagrams:
  - id: order-creation-flow
    version: 1.0.0
---

## Event Details

This event is published when...
```

## Viewing referenced diagrams

When viewing a resource that references diagrams, users will see:

1. A "Diagrams" section in the sidebar navigation
2. Each diagram listed with its name
3. Clicking a diagram navigates to the full diagram page
4. The diagram page includes version selection and full content
