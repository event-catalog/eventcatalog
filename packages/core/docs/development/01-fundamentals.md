---
sidebar_position: 2
slug: /development/getting-started/fundamentals
keywords:
- EventCatalog introduction
sidebar_label: Fundamentals
title: Fundamentals
description: Understanding the fundamentals of EventCatalog
---

EventCatalog is a self hosted [open source documentation tool](https://github.com/event-catalog/eventcatalog/stargazers) for software architecture. It allows you to document your architecture using software primitives and patterns such as domains, systems and resources rather than random documentation pages (e.g Confluence).

EventCatalog follows the [docs-as-code](https://www.writethedocs.org/guide/docs-as-code/) pattern. Your documentation is stored in code using [markdown (MDX)](https://mdxjs.com/) and stays private, in your own repository and infrastructure. 

At its core, EventCatalog gives you a small set of building blocks for your documentation.

![EventCatalog model showing domains, systems, resources, contracts, and ownership](./img/levels-catalog.png)

- **Domains (Level 1)** - a domain describes a business boundary
- **Systems (Level 2)** - a system is a collection of resources that work together to perform a function.
- **Resources (Level 3)** - individual resources (e.g services, messages, data stores) that can be assigned to systems or domains.

:::info What blocks to use?
All building blocks are optional in your catalog. It's up to you how you want to model your documentation.

Want to match your c4 model?, you can. Want to document a monolith you can. Want to document distributed systems you can.
We focus on architecture primitives and let you fill in the details.
:::

## The EventCatalog model

Domains describe a business capability or boundary. They help users understand the boundaries in your architecture, such as `Shopping`, `Payments`, `Fulfilment`, or `Customer`.

Systems give your catalog an operating shape. A system is a collection of resources that work together to perform a function. For example, a `Shopping` domain might contain a `Cart System` and a `Promotion System`.

Resources are the documented building blocks inside your architecture. They can include:

- [Services](/docs/development/guides/resources/services/introduction), such as APIs, workers, frontends, and backends.
- [Messages](/docs/development/guides/resources/messages/what-are-messages), such as events, commands, and queries.
- [Data stores](/docs/development/guides/resources/data/introduction), such as databases, caches, and file stores.
- [Entities](/docs/development/guides/resources/entities/introduction), such as `Order`, `Customer`, or `Payment`.
- [Data products](/docs/development/guides/resources/data-products/introduction), such as warehouse tables or analytical datasets.
- [Agents](/docs/development/guides/resources/agents/introduction), such as customer support AI agents.
- [Flows](/docs/development/guides/resources/flows/introduction), such as business workflows.

Contracts are attached to resources. Schemas, OpenAPI specs, AsyncAPI specs, and GraphQL schemas help users understand the data and interfaces that resources produce, consume, or implement.

Teams and users can own domains, systems, resources, and contracts. This makes ownership part of the architecture model, not a separate spreadsheet.

## Levels of detail

Architecture documentation all have different audiences, and EventCatalog can be useful to anyone in your organization.

You can define a high level of information for stakeholders whilst whilst giving lower level implementation details for developers.

| Level | Name | What it answers | Example |
|-------|------|-----------------|---------|
| Level 1 | Domains | High level, what business boundary are we looking at? | Shopping |
| Level 2 | Systems | What software capability exists inside that boundary? | Cart System |
| Level 3 | Resources | What makes up, connects to, or documents that system? | Cart API, cart database, checkout flow |

Contracts and ownership sit across these levels. A service can implement an OpenAPI contract. A message can have a schema. A team can own a domain, system, or resource.

This gives different users a way into the same catalog. Architects can start at domains, platform teams can reason about systems, and developers can drill into the resources and contracts they work with every day.

## Docs-as-code

EventCatalog is a [docs-as-code](https://www.writethedocs.org/guide/docs-as-code/) tool. This means you can store your documentation in your existing Git repository, version it, and use your existing workflows to review and merge changes.

This also let's you define custom workflows and patterns in your organization for documentation and automation. 

It's up to you where you define your catalog (or catalogs). Here are some examples:

| Pattern | Description |
|---------|-------------|
| **Standalone repo** | Keep documentation separate from code |
| **Next to your code** | Docs live alongside the services they describe |
| **Monorepo** | Documentation as part of your existing monorepo |
| **Federated** | Multiple EventCatalog instances connected into one view |


## Living documentation

Your documentation can also be automated, keeping your implementation details close to your documentation. There are many [integrations](/integrations) or you can create your own automations with our [SDK](/docs/sdk). We also have started building some [AI Agents to help you manage your documentation](https://github.com/event-catalog/agents) in CI/CD environments.

## Visual editing

You can also use [EventCatalog Editor](/docs/editor/overview) to maintain your catalog through a local visual workflow.

The editor runs on top of your EventCatalog project, writes changes back to the same local files, and gives you a Git-backed way to review and publish changes. This helps developers, architects, analysts, and product owners contribute to the catalog without needing to work directly in Markdown files.


## Ready to build?

Now that you understand the fundamentals, [get started with EventCatalog](/docs/development/getting-started/installation).
