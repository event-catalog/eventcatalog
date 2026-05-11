---
sidebar_position: 4
keywords:
- EventCatalog diagrams
- Diagram versioning
sidebar_label: Versioning diagrams
title: Versioning diagrams
description: How to create and manage versioned diagrams in EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.3.0" />

Diagrams in EventCatalog support versioning, allowing you to track how your architecture visualizations evolve over time. This is particularly valuable for maintaining historical accuracy and showing architectural progression.

## Why version diagrams?

Versioning diagrams helps you:

- **Track architectural evolution** - Show how your system design has changed over time
- **Maintain historical accuracy** - Preserve diagrams as they existed at specific points
- **Compare versions** - See what changed between different architectural states
- **Align with resource versions** - Match diagram versions to corresponding service or domain versions
- **Document migrations** - Illustrate the journey from current state to target state

## Creating versioned diagrams

Similar to other resources in EventCatalog, diagrams use a `versioned` folder structure to maintain multiple versions.

### File structure

```
/diagrams/
  └── system-architecture/
      ├── index.mdx                    # Latest version (e.g., 2.0.0)
      └── versioned/
          ├── 1.0.0/
          │   └── index.mdx            # Version 1.0.0
          └── 1.5.0/
              └── index.mdx            # Version 1.5.0
```

The diagram at the root level (`/diagrams/system-architecture/index.mdx`) represents the **latest version**. Older versions are stored in the `versioned` folder, each in their own version directory.

### Example: Current state vs. target state

A common use case is documenting both your current architecture and your target architecture as different versions:

```md title="/diagrams/architecture/index.mdx (v2.0.0 - Target State)"
---
id: architecture
name: System Architecture
version: 2.0.0
summary: Target microservices architecture we are migrating towards
---

## Target State (v2.0.0)

This is our target architecture - the event-driven microservices platform we are actively migrating towards.

\`\`\`mermaid
graph TB
    WebApp[Web Application]
    Gateway[API Gateway]

    subgraph "Microservices"
        OrderService[Order Service]
        PaymentService[Payment Service]
        InventoryService[Inventory Service]
    end

    Kafka[Event Stream]

    WebApp --> Gateway
    Gateway --> OrderService
    Gateway --> PaymentService
    Gateway --> InventoryService

    OrderService --> Kafka
    PaymentService --> Kafka
    InventoryService --> Kafka
\`\`\`

### Expected Outcomes

- 10x faster deployments
- 99.9% availability
- 50% cost reduction through auto-scaling
```

```md title="/diagrams/architecture/versioned/1.0.0/index.mdx (v1.0.0 - Current State)"
---
id: architecture
name: System Architecture
version: 1.0.0
summary: Current monolithic architecture (legacy system)
---

## Current State (v1.0.0)

This represents our current monolithic architecture that we are migrating away from.

_```mermaid
graph TB
    WebApp[Web Application]
    Monolith[Monolithic Application]
    Database[(Single Database)]

    WebApp --> Monolith
    Monolith --> Database
```

### Current Limitations

- Single deployment unit
- Scaling challenges
- Technology constraints
```

## Version switching

When viewing a diagram that has multiple versions, EventCatalog displays a version dropdown in the header. Users can:

1. See all available versions in the dropdown
2. Switch between versions to compare changes
3. The URL updates to reflect the selected version (e.g., `/diagrams/architecture/2.0.0`)

The latest version is clearly marked in the dropdown with a "(latest)" indicator.

## Referencing specific versions

When referencing diagrams from resources, you can specify which version to link to:

```yaml title="Domain referencing specific diagram versions"
---
id: E-Commerce
name: E-Commerce Domain
version: 1.0.0
diagrams:
  # Reference the current state
  - id: architecture
    version: 1.0.0
---
```

As you update your domain to newer versions, you can update the diagram reference to match:

```yaml title="Updated domain referencing target architecture"
---
id: E-Commerce
name: E-Commerce Domain
version: 2.0.0
diagrams:
  # Reference the target state
  - id: architecture
    version: 2.0.0
---
```

## Best practices

### Version numbering

Follow semantic versioning principles:

- **Major version** (2.0.0) - Significant architectural changes (e.g., monolith to microservices)
- **Minor version** (1.1.0) - New services or components added
- **Patch version** (1.0.1) - Small corrections or clarifications to the diagram

### When to create new versions

Create a new diagram version when:

- The architecture fundamentally changes
- Major components are added or removed
- You want to preserve a snapshot for historical reference
- You're planning a migration and want to document both states

### Keep versions aligned

When possible, align diagram versions with the resources they document:

```yaml
# Service at version 2.0.0
---
id: OrderService
version: 2.0.0
diagrams:
  # Reference matching diagram version
  - id: order-service-architecture
    version: 2.0.0
---
```

## Markdown export for all versions

All diagram versions support markdown export, making them accessible to LLM tools and AI assistants. Each version has its own `.mdx` endpoint:

- `/diagrams/architecture/2.0.0.mdx` - Latest version
- `/diagrams/architecture/1.0.0.mdx` - Version 1.0.0
- `/diagrams/architecture/1.5.0.mdx` - Version 1.5.0

This allows AI tools to understand the full context of your architectural evolution.
