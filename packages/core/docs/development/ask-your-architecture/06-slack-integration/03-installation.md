---
sidebar_position: 3
keywords:
- Slack Bot
- Installation
sidebar_label: Installation
title: Installation
description: Install and configure the bot
---

import PlanBanner from '@site/src/components/MDX/PlanBanner';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<PlanBanner plan="Scale" />

Install the EventCatalog Slack Bot locally or deploy it to your infrastructure. The bot runs as a long-lived process that maintains a connection to Slack.

## Install locally

### Clone repository

```bash
git clone https://github.com/event-catalog/eventcatalog-slack-bot.git
cd eventcatalog-slack-bot
```

### Install dependencies

<Tabs>
  <TabItem value="npm" label="npm" default>
    ```bash
    npm install
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash
    pnpm install
    ```
  </TabItem>
</Tabs>

### Configure environment

Create a `.env` file with your credentials:

```bash
# EventCatalog Scale License (Required)
EVENTCATALOG_SCALE_LICENSE_KEY=XXXX-XXXX-XXXX-XXXX-XXXX-XXXX

# Slack Credentials (Required)
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...

# AI Provider (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# GOOGLE_GENERATIVE_AI_API_KEY=...
```

### Create configuration

Create `eventcatalog-bot.config.ts`:

```typescript
export default {
  eventCatalog: {
    url: 'http://localhost:3000',
    // Optional: Add authentication headers
    // headers: {
    //   'Authorization': 'Bearer your-token',
    // },
  },
  ai: {
    provider: 'anthropic', // 'anthropic' | 'openai' | 'google'
    // model: 'claude-sonnet-4-20250514', // Optional: override default model
    maxSteps: 5,
    temperature: 0.4,
  },
  slack: {
    // Optional: Channel IDs for auto-reply (bot responds to all messages)
    autoReplyChannels: [],
    // Optional: Custom icon URL for bot messages
    icon: 'https://www.eventcatalog.dev/img/logo.png',
    // Optional: Custom username for bot messages
    username: 'EventCatalog',
  },
};
```

### Start the bot

<Tabs>
  <TabItem value="npm" label="npm" default>
    ```bash
    npm run dev
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash
    pnpm dev
    ```
  </TabItem>
</Tabs>

Or with a custom config path:

<Tabs>
  <TabItem value="npm" label="npm" default>
    ```bash
    npm run dev -- --config ./my-config.ts
    ```
  </TabItem>
  <TabItem value="pnpm" label="pnpm">
    ```bash
    pnpm dev --config ./my-config.ts
    ```
  </TabItem>
</Tabs>

## Configuration reference

### eventCatalog

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `url` | string | Yes | URL of your EventCatalog instance |
| `headers` | object | No | Authentication headers if needed |

### ai

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | string | Required | AI provider: `anthropic`, `openai`, or `google` |
| `model` | string | Provider default | Model to use (see [supported models](#supported-ai-providers)) |
| `maxSteps` | number | 5 | Maximum tool-calling steps (1-20) |
| `temperature` | number | 0.4 | AI temperature (0-2) |

### slack

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoReplyChannels` | string[] | [] | Channel IDs where bot auto-replies to all messages |
| `icon` | string | EventCatalog logo | Custom icon URL for bot messages |
| `username` | string | 'EventCatalog' | Custom display name for bot messages |

## Supported AI providers

| Provider | Environment Variable | Default Model |
|----------|---------------------|---------------|
| Anthropic | `ANTHROPIC_API_KEY` | `claude-sonnet-4-20250514` |
| OpenAI | `OPENAI_API_KEY` | `gpt-4o` |
| Google | `GOOGLE_GENERATIVE_AI_API_KEY` | `gemini-2.0-flash` |

You can override the default model in your configuration. For a full list of available models, see the [Vercel AI SDK Providers documentation](https://ai-sdk.dev/providers/ai-sdk-providers).

```typescript
ai: {
  provider: 'anthropic',
  model: 'claude-opus-4-20250514', // Use a different model
}
```

## License key

Get your EventCatalog Scale license key from [eventcatalog.cloud](https://eventcatalog.cloud). A 30-day free trial is available.

The license key must be set as the `EVENTCATALOG_SCALE_LICENSE_KEY` environment variable.
