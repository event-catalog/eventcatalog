---
sidebar_position: 2
keywords:
- components
sidebar_label: Using AI with EventCatalog
title: AI with EventCatalog
description: Architecture documentation for humans and AI
---

EventCatalog helps you document your architecture for both teams and your AI tools. Your team gets a visual catalog to explore your system. Your AI tools get structured access to query and reason about your architecture.

You can disable the AI chat feature at any time by setting `chat.enabled: false` in your `eventcatalog.config.js`. This hides the chat UI and stops chat requests even when all other prerequisites (plan, server mode, config file) are met.

## AI integrations

EventCatalog supports four ways to connect AI to your documentation:

- [EventCatalog Assistant](/docs/development/ask-your-architecture/eventcatalog-assistant/what-is-eventcatalog-assistant)
  - Bring your own model to EventCatalog itself, and ask questions about your documentation directly in the browser.
- [EventCatalog MCP Server](/docs/development/ask-your-architecture/mcp-server/introduction)
  - Connect your MCP clients (e.g Cursor, Windsurf, Claude Desktop) to EventCatalog.
- [Slack Integration](/docs/development/ask-your-architecture/slack-integration/introduction)
  - Query your architecture directly from Slack using the EventCatalog Slack Bot.
- [AI Skills](/docs/development/ask-your-architecture/skills/introduction)
  - Pre-built skills that teach AI coding agents how to generate correct EventCatalog documentation.
