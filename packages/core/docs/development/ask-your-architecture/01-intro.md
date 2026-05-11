---
sidebar_position: 2
keywords:
- components
sidebar_label: Using AI with EventCatalog
title: AI with EventCatalog
description: Architecture documentation for humans and AI
---

import AddedIn from '@site/src/components/MDX/AddedIn';

EventCatalog helps you document your architecture for both teams and your AI tools. Your team gets a visual catalog to explore your system. Your AI tools get structured access to query and reason about your architecture.

You can disable the AI chat feature at any time by setting `chat.enabled: false` in your `eventcatalog.config.js`. This hides the chat UI and stops chat requests even when all other prerequisites (plan, server mode, config file) are met.

## AI integrations

EventCatalog supports five ways to use AI with your catalog:

- [EventCatalog Assistant](/docs/development/ask-your-architecture/eventcatalog-assistant/what-is-eventcatalog-assistant)
  - Bring your own model to EventCatalog itself, and ask questions about your documentation directly in the browser.
- [EventCatalog MCP Server](/docs/development/ask-your-architecture/mcp-server/introduction)
  - Connect your MCP clients (e.g Cursor, Windsurf, Claude Desktop) to EventCatalog.
- [Slack Integration](/docs/development/ask-your-architecture/slack-integration/introduction)
  - Query your architecture directly from Slack using the EventCatalog Slack Bot.
- [AI Skills](/docs/development/ask-your-architecture/skills/introduction)
  - Pre-built skills that teach AI coding agents how to generate correct EventCatalog documentation.
- [Bundled docs for coding agents](#bundled-docs-for-coding-agents)
  - Version-matched docs bundled inside `@eventcatalog/core` so agents always reference accurate APIs, not stale training data.

## Bundled docs for coding agents

<AddedIn version="3.35.1" />

AI coding agents (Claude Code, Cursor, Copilot, and others) are trained on a snapshot of the web. EventCatalog's API, frontmatter conventions, and folder structure evolve with each release, so an agent relying on training data alone may generate outdated or incorrect files.

Starting in `3.35.1`, `@eventcatalog/core` bundles the full documentation inside the package itself. After installing EventCatalog, the docs are available at:

```
node_modules/@eventcatalog/core/dist/docs/
```

No extra install or network request is needed. The bundled docs mirror the structure of the EventCatalog website (api, cli, development, plugins, and more) and are always version-matched to the package you have installed.

### Use with new projects

Projects scaffolded with `npx create-eventcatalog@latest` automatically receive two files in the project root:

- `AGENTS.md` — read by most coding agents before they act. It tells the agent to find and read the relevant doc in `node_modules/@eventcatalog/core/dist/docs/` before doing any EventCatalog work.
- `CLAUDE.md` — a single `@AGENTS.md` line that re-exports the rules for Claude Code without duplicating content.

No manual setup is required for new projects.

### Use with existing projects

Add the two files to the root of your EventCatalog project:

**`AGENTS.md`**

```markdown
<!-- BEGIN:eventcatalog-agent-rules -->
# EventCatalog: ALWAYS read docs before coding

Before any EventCatalog work, find and read the relevant doc in `node_modules/@eventcatalog/core/dist/docs/`. Your training data may be outdated. The bundled docs are the source of truth.

<!-- END:eventcatalog-agent-rules -->
```

**`CLAUDE.md`**

```
@AGENTS.md
```

The `BEGIN` / `END` markers in `AGENTS.md` let you add your own project-specific instructions outside the managed block. EventCatalog will only update content inside those markers in future releases.

### Understand the docs layout

The bundled docs follow the same structure as the EventCatalog website:

```
node_modules/@eventcatalog/core/dist/docs/
├── api/          # Frontmatter reference for all resource types
├── cli/          # CLI commands
├── development/  # Getting started, guides, customization
└── plugins/      # Generator and plugin documentation
```

Point your agent at a specific subdirectory when you want it to focus. For example, to document a new service, read `dist/docs/api/04-service-api.md` and `dist/docs/development/guides/services/`.
