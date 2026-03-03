---
title: EventCatalog Compass
description: Model your event-driven architecture in .ec files and keep it in sync with EventCatalog.
---

Architecture design usually starts in Miro boards, Confluence pages, and Slack threads.
They’re great for brainstorming — but they go stale the moment implementation begins.

Compass exists to answer a simple question:

- Why can’t we design using the specs and documentation we already have?
- Why can’t we model future ideas from what already exists?
- Why can’t architecture evolve alongside the system?

Compass lets you model architecture in .ec files.

Import resources from AsyncAPI, OpenAPI, or EventCatalog.
Compose new domains, services, and flows.
Export your model back to EventCatalog and give your team a living architecture portal.

:::caution[Beta]
Compass and the `.ec` docs experience are in beta.
Share feedback in [GitHub Issues](https://github.com/event-catalog/eventcatalog/issues/new).
:::

## Why `.ec` files

.ec is a text-based format for modeling distributed systems.

Define services, messages, domains, and channels in a single readable file.

Because it’s plain text, you get things diagrams and wikis can’t:

- **Start from what you already have**. Import events, operations, and channels from AsyncAPI and OpenAPI. No retyping what your specs already describe.
- **Build on existing documentation.** Pull services, messages, and domains from EventCatalog and use them as building blocks for new designs.
- **Review changes like code.** Architecture updates become Git diffs and pull requests.
- **Iterate without friction.** Model and refine future-state ideas directly in your repository.
- **Keep docs and models aligned.** Move between EventCatalog and .ec without drift.
- **Structured and machine-readable.** .ec is constrained and parseable, making it easy to analyze, generate, or refactor programmatically.

## How it works

- **Model** resources in .ec files using a readable DSL.
- **Review** changes through Git diffs and pull requests.
- **Publish** models to EventCatalog to generate documentation.
- **Refine** the next change from your .ec files.

Your documentation is never a static snapshot. It becomes the starting point for the next iteration.

## Get started

- **New to Compass?** Start with the [Tutorial](/docs/get-started/tutorial/) to build your first model.
- **Want the full reference?** Read the [DSL Specification](/docs/reference/dsl-spec/).
- **Explore resources:** [Services](/docs/resources/services/) | [Messages](/docs/resources/messages/) | [Domains](/docs/resources/domains/) | [Channels](/docs/resources/channels/)
