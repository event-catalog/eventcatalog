---
sidebar_position: 2
keywords:
- EventCatalog diagrams
- Creating diagrams
sidebar_label: Create a diagram
title: Create a diagram
description: How to create and organize diagrams in EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PromptBox from '@site/src/components/MDX/PromptBox';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

EventCatalog Diagrams let's you bring your own diagrams into your Catalog.

![System Architecture diagram](./img/diagrams.png)

## Creating a diagram

### Automatic Creation

<PromptBox preview="Create a new EventCatalog diagram">
Read https://www.eventcatalog.dev/docs/development/bring-your-own-documentation/diagrams/creating-diagrams.md and https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/diagrams.md then help me create a new EventCatalog diagram in my catalog.

Ask me for the diagram name, what it shows, summary, whether it belongs at the root of the catalog or inside a resource, and what diagram format I want to use such as Mermaid, PlantUML, an embedded tool, an image, or markdown. Then create the correct diagrams/{'{Diagram Name}'}/index.mdx, domains/{'{Domain Name}'}/diagrams/{'{Diagram Name}'}/index.mdx, services/{'{Service Name}'}/diagrams/{'{Diagram Name}'}/index.mdx, or another relevant resource-level diagrams/{'{Diagram Name}'}/index.mdx file with frontmatter and starter markdown.

If I want to embed an external diagram, ask for the embed URL and use the correct EventCatalog diagram component if one exists.

If the catalog does not have a relevant resource, put it into the root diagrams folder.

You can use MDX components found here https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/components.md
</PromptBox>

Copy this prompt and paste it into your coding agent. Your agent can help you choose where the diagram should live, create the right folder structure, and add the first version of the diagram documentation.

### Manual Creation

Diagrams live in a `diagrams` folder. EventCatalog discovers any `index.mdx` file inside a `diagrams` directory, regardless of where that directory lives in your catalog.

You can place diagrams:

At the root of your catalog:

<ProjectTree
  items={[
    {
      name: 'diagrams',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'system-overview',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'index.mdx', highlight: true }],
        },
      ],
    },
  ]}
/>

Inside a domain:

<ProjectTree
  items={[
    {
      name: 'domains',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'E-Commerce',
          type: 'folder',
          defaultOpen: true,
          children: [
            {
              name: 'diagrams',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'target-architecture',
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

Inside a service:

<ProjectTree
  items={[
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
            {
              name: 'diagrams',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'api-flow',
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

:::tip
Organize diagrams close to where they're most relevant. System-wide diagrams can be placed at the root level, while resource-specific diagrams should live within that resource's folder.
:::

## Create the diagram file

Create an `index.mdx` file for the diagram.

Here is an example of a system architecture diagram:

```md title="/diagrams/system-overview/index.mdx (example)"
---
id: system-overview
name: System Overview
version: 1.0.0
summary: High-level architecture showing all microservices and their interactions
---

## System Architecture

This diagram shows our microservices architecture:

\`\`\`mermaid
graph TB
    subgraph "Frontend"
        WebApp[Web Application]
        MobileApp[Mobile App]
    end

    subgraph "Backend Services"
        Gateway[API Gateway]
        OrderService[Order Service]
        PaymentService[Payment Service]
        InventoryService[Inventory Service]
    end

    subgraph "Data Layer"
        OrderDB[(Orders DB)]
        PaymentDB[(Payments DB)]
        Kafka[Event Stream]
    end

    WebApp --> Gateway
    MobileApp --> Gateway
    Gateway --> OrderService
    Gateway --> PaymentService
    OrderService --> Kafka
    PaymentService --> Kafka
    OrderService --> OrderDB
    PaymentService --> PaymentDB
\`\`\`

### Key Components

- **API Gateway**: Single entry point for all client requests
- **Order Service**: Handles order creation and management
- **Payment Service**: Processes payments and refunds
- **Event Stream**: Kafka for asynchronous communication
```


### Example with PlantUML

```md title="/diagrams/order-flow/index.mdx (example)"
---
id: order-flow
name: Order Processing Flow
version: 1.0.0
summary: Sequence diagram showing the complete order processing flow
---

\`\`\`plantuml
@startuml
actor Customer
participant "Order Service" as Order
participant "Payment Service" as Payment
participant "Inventory Service" as Inventory

Customer -> Order: Create Order
Order -> Inventory: Check Stock
Inventory --> Order: Stock Available
Order -> Payment: Process Payment
Payment --> Order: Payment Confirmed
Order --> Customer: Order Confirmed
@enduml
\`\`\`

## Order Processing Flow

This sequence diagram illustrates the order processing workflow:

1. Customer initiates order creation
2. Order service validates inventory availability
3. Payment is processed
4. Order confirmation is sent to customer
```

### Example with embedded diagram

EventCatalog provides built-in components to embed diagrams from popular tools like Miro, IcePanel, Lucidchart, draw.io, and FigJam. This lets you bring your existing collaborative diagrams directly into your catalog.

```md title="/diagrams/architecture-overview/index.mdx (example)"
---
id: architecture-overview
name: Architecture Overview
version: 1.0.0
summary: Miro board showing our system architecture and design decisions
---

<Miro embedUrl="https://miro.com/app/board/..." />

## Architecture Overview

This Miro board captures our architecture decisions and system design.
Key areas covered:

- System context
- Container architecture
- Component relationships
- Technology choices
```

:::tip
Check out the [Diagrams documentation](/docs/components/diagram-syntax) to see all available diagram syntax and embed components including `<Miro>`, `<IcePanel>`, `<Lucid>`, `<DrawIO>`, and `<FigJam>`.
:::

## Next steps

Once you've created diagrams, you can:

- [Reference them from resources](/docs/development/bring-your-own-documentation/diagrams/referencing-diagrams) like domains, services, and messages
- [Compare diagram versions](/docs/development/bring-your-own-documentation/diagrams/comparing-diagrams) side-by-side
