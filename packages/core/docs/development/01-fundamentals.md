---
sidebar_position: 2
slug: /development/getting-started/fundamentals
keywords:
- EventCatalog introduction
sidebar_label: Fundamentals
title: Fundamentals
description: Understanding the fundamentals of EventCatalog
---

EventCatalog allows you to document your [domains](/docs/development/guides/domains/introduction), [services](/docs/development/guides/services/introduction), [messages](/docs/development/guides/messages/overview) ([events](/docs/development/guides/messages/events/introduction), [commands](/docs/development/guides/messages/commands/introduction), [queries](/docs/development/guides/messages/queries/introduction)), [data products](/docs/development/guides/data-products/introduction), [data stores](/docs/development/guides/data/introduction), [diagrams](/docs/development/guides/diagrams/introduction), [schemas](/docs/development/guides/schemas/introduction), [specifications](/docs/development/guides/services/adding-to-services/openapi) and more.

You can manually document these resources or you can automate the documentation process using EventCatalog integrations (e.g. [OpenAPI](/integrations/openapi), [AsyncAPI](/integrations/asyncapi), [GraphQL](/integrations/graphql) or schema registries), it's up to you.

EventCatalog is flexible and can fit any workflow you have. Deploy it once a day, or 100 times a day. Connect it to external systems like schema registries, API management platforms, or your own custom integrations.

EventCatalog is powered by [markdown files (MDX)](https://mdxjs.com/) and can be used in any markdown editor or IDE.

### Docs-as-code

EventCatalog is a [docs-as-code](https://www.writethedocs.org/guide/docs-as-code/) tool. This means you can store your documentation in your existing Git repository, version it, and use your existing workflows to review and merge changes.

| Pattern | Description |
|---------|-------------|
| **Standalone repo** | Keep documentation separate from code |
| **Next to your code** | Docs live alongside the services they describe |
| **Monorepo** | Documentation as part of your existing monorepo |
| **Federated** | Multiple EventCatalog instances connected into one view |

EventCatalog does not force you to use a specific broker, schema format, or stack. You can use it with any broker, schema format, or stack and can fit into any workflow you have. EventCatalog fits your workflow, not the other way around.

### Visual editing

You can also use [EventCatalog Editor](/docs/editor/overview) to maintain your catalog through a local visual workflow.

The editor runs on top of your EventCatalog project, writes changes back to the same local files, and gives you a Git-backed way to review and publish changes. This helps developers, architects, analysts, and product owners contribute to the catalog without needing to work directly in Markdown files.


## Ready to build?

Now that you understand the fundamentals, [get started with EventCatalog](/docs/development/getting-started/installation).
