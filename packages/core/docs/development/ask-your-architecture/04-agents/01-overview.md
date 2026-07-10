---
sidebar_position: 1
keywords:
  - AI Agents
  - documentation generation
  - automation
sidebar_label: Overview
title: EventCatalog Agents
description: AI agents that help you manage and document your architecture with EventCatalog
---

[EventCatalog Agent](https://github.com/event-catalog/agents) is an agent that helps you manage your documentation through CI/CD and adds a governing layer to your pull requests.

Our Agent understands EventCatalog conventions (domains, systems and resources) and uses that understanding to keep your architecture documented for you, without you having to hand-write and maintain every catalog file yourself.

EventCatalog Agent lets you define and bring your own model.

### Available workflows

| Agent | What it does |
| --- | --- |
| [Code-to-Docs](/docs/development/ask-your-architecture/agents/code-to-docs) | The EventCatalog Agent will review your pull request code and update your catalog documentation for you. |
| [Breaking Changes](/docs/development/ask-your-architecture/agents/breaking-changes) | Detects breaking schema changes in a pull request and shows which catalog consumers could be affected. |

### Have an idea for a workflow?

More agents and AI workflows are on the way. If you have an idea for an agent or an AI workflow you'd like to see in EventCatalog, [open an issue on GitHub](https://github.com/event-catalog/agents/issues/new) and let us know. We use these ideas to decide what to build next.
