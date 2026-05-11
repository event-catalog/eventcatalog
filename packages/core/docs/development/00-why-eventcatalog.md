---
sidebar_position: 1
slug: /development/getting-started/introduction
keywords:
- EventCatalog introduction
sidebar_label: Why EventCatalog?
title: Why EventCatalog?
description: EventCatalog is an open source project to help you bring discoverability to your event-driven architecture.
---

Many companies adopting event-driven architectures end up in a **distributed big ball of mud**.

There can be many reasons for this...but one overlooked reason is that teams are not documenting their architectures, they lack standards, governance and discoverability.

Your teams start to ask questions like:

- _"What messages do we have?"_
- _"How are consumers and producers using these messages?"_
- _"What common fields are across our schemas? What is the drift?"_
- _"What's the business context behind this architecture?"_
- _"Where can I find the schemas of these messages?"_
- _"What services or domains do we have in our architecture?"_
- _"How can I make changes?"_
- _"Who is consuming these messages?"_
- _And the list goes on..._

Time is lost hunting through multiple tools to find the answers to these questions.

**What if you could answer these questions in minutes?**

EventCatalog is designed to help you avoid the chaos, by providing a way to document your architecture, visualize it, and provide tools to help your teams and AI tools to save time and get answers to the questions when they need them.

---

## What is EventCatalog?

[EventCatalog is a self-hosted open source project](https://github.com/event-catalog/eventcatalog) to help you bring discoverability to your architecture through documentation, visualization, and design for both humans and AI.

EventCatalog models your architecture as structured, versioned knowledge — not just pages of documentation — so it can be searched, visualized, and queried reliably over time.

**EventCatalog is technology agnostic**, you can use it and integrate with any broker, schema format, or stack.

#### What can EventCatalog do for you?

- **Save time and help your teams find answers fast**
  - Search your entire architecture — domains, services, events, data products, schemas, owners — in seconds
  - Stop asking "who owns this?" or "what consumes this event?"
- **Keep documentation and specifications in sync**
  - Auto-generate docs from your OpenAPI, AsyncAPI, or schema registries
  - Documentation that updates when your specs update
  - Write custom integrations with the [EventCatalog SDK](/docs/sdk)
- **Query your architecture with AI**
  - Connect AI tools to your architecture using [EventCatalog's MCP server](/docs/development/ask-your-architecture/mcp-server/introduction)
  - Ask architectural questions grounded in your documented domains, services, events, data products, and schemas
- **See the bigger picture**
  - Visualize your architecture, domains, services, and message flows
  - Document business workflows and draft new ideas
  - Understand how everything connects — without digging through code
- **Design what's next**
  - Capture business workflows and plan changes visually
  - Use your real architecture as building blocks

**EventCatalog is self-hosted. You own your data and host it wherever you want.**

---

## Why we built this

Event-driven architectures start simple but grow complex fast. More services, more events, more teams — and suddenly nobody knows how anything connects.

EventCatalog brings discoverability, documentation, and visualization to your architecture — so teams can reason about change before it happens, not after.

<details>
<summary>🎥 Watch: "Complexity is the Gotcha of Event-driven Architecture"</summary>
<iframe width="100%" height="415" src="https://www.youtube.com/embed/VLUvfIm9wnQ?si=XEEkOqHyZBynqZHo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</details>

---

## Join the community

- [GitHub](https://github.com/event-catalog/eventcatalog) — Star, contribute, report issues
- [Discord](https://eventcatalog.dev/discord) — Ask questions, share feedback

## Something missing?

If you find issues with the documentation or have suggestions on how to improve the documentation or the project in general, please [file an issue](https://github.com/event-catalog/eventcatalog) for us.
