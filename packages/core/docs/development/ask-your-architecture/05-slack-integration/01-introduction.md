---
sidebar_position: 1
keywords:
- Slack Bot
- Slack Integration
sidebar_label: Introduction
title: Slack integration
description: Query architecture documentation directly from Slack
---

import PlanBanner from '@site/src/components/MDX/PlanBanner';

<PlanBanner plan="Scale" />

The EventCatalog Slack Bot connects to your EventCatalog MCP server, allowing teams to query architecture documentation directly from Slack. Ask questions about events, services, domains, and schemas without leaving your workspace.

The slack bot is self hosted, you own your data and deployment.

<div className="flex justify-center items-center gap-4 flex-col">
  <img src="/img/slack.png" alt="EventCatalog Slack Bot" className="rounded-lg" style={{ width: '30%', height: 'auto' }} />
  <span className="text-center text-sm text-gray-500">Example of the EventCatalog Slack Bot in action asking about the OrderCreated event</span>
</div>

## How it works

1. You configure the bot with your own AI provider and model (e.g. Anthropic, OpenAI, Google)
1. Users @mention the bot or post in dedicated channels
2. The bot queries your EventCatalog MCP server
3. AI-powered responses appear in threads to keep channels organized

## Key features

- **@Mention anywhere** - Add the bot to any channel and ask questions
- **Dedicated channels** - Create auto-reply channels for architecture questions
- **Multiple AI providers** - Works with Anthropic, OpenAI, or Google
- **Self-hosted** - Your data stays private, you control your data and deployment
- **Socket Mode** - No public URL or webhooks needed
- **Custom tools support** - Bring your own integrations for real-time data

## Custom tools

The Slack bot supports [custom tools](/docs/development/ask-your-architecture/eventcatalog-assistant/bring-your-own-tools) defined in your `eventcatalog.chat.js` file. This means you can bring real-time data into your Slack conversations:

- Query production metrics from Datadog or Prometheus
- Check service health and uptime
- Look up on-call engineers from PagerDuty
- Fetch queue depths from Kafka
- Any custom integration your team needs

Custom tools work automatically - the AI decides when to use them based on user questions. Ask "who is on-call for OrderService?" and get live data directly in Slack.

## Prerequisites

- EventCatalog instance (with configured MCP server) running in [SSR mode](/docs/development/deployment/build-ssr-mode)
- [EventCatalog Scale license](https://eventcatalog.cloud)
- Slack workspace with app creation permissions
- API key for your chosen AI provider

## Repository

The EventCatalog Slack Bot is open source:

[github.com/event-catalog/eventcatalog-slack-bot](https://github.com/event-catalog/eventcatalog-slack-bot)
