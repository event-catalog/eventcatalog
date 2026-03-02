---
title: EventCatalog Compass
description: Model your event-driven architecture in .ec files and keep it in sync with EventCatalog.
---

Architecture design starts in Miro boards, Confluence pages, and Slack threads. Those tools are great for brainstorming, but they create artifacts that go stale the moment implementation begins.

EventCatalog Compass gives you a better starting point: define your architecture in `.ec` files, review changes in Git, and sync directly with EventCatalog.

:::caution[Beta]
Compass and the `.ec` docs experience are in beta.
Share feedback in [GitHub Issues](https://github.com/event-catalog/eventcatalog/issues/new).
:::

## Why `.ec` files

`.ec` is a text-based format purpose-built for event-driven architecture. You define services, messages, domains, channels, and more in a single readable file.

Because it's plain text, you get things that diagrams and wikis can't offer:

- **Start from what you already have.** Import events, operations, and channels directly from your AsyncAPI and OpenAPI specs. No re-typing what your specs already describe.
- **Model with your existing documentation.** Pull services, messages, and domains from an existing EventCatalog and use them as building blocks for new designs.
- **Git diffs and pull requests.** Architecture changes become reviewable, just like code.
- **Fast iteration.** Model a future-state service in seconds, not hours.
- **No drift.** Export from EventCatalog to `.ec`, make changes, import back. The loop keeps docs and models in sync.
- **AI-friendly by design.** `.ec` is a structured, constrained format that LLMs can read, generate, and refactor. Use AI to draft models, compare architectures, or bootstrap from existing specs.

## How it works

1. **Model** resources in `.ec` files using a readable DSL.
2. **Review** changes through Git diffs and pull requests.
3. **Import** models into EventCatalog to generate documentation.
4. **Export** back to `.ec` as the starting point for the next change.

This circular workflow means your documentation is never a dead snapshot. It's always the starting point for the next iteration.

## Get started

- **New to Compass?** Start with the [Tutorial](/get-started/tutorial/) to build your first model.
- **Want the full reference?** Read the [DSL Specification](/reference/dsl-spec/).
- **Setting up locally?** Follow the [CLI Setup](/get-started/cli-setup/) guide.
- **Explore resources:** [Services](/resources/services/) | [Messages](/resources/messages/) | [Domains](/resources/domains/) | [Channels](/resources/channels/)
