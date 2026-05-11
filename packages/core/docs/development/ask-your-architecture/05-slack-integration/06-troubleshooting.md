---
sidebar_position: 6
keywords:
- Slack Bot
- Troubleshooting
sidebar_label: Troubleshooting
title: Troubleshooting
description: Common issues and solutions
---

import PlanBanner from '@site/src/components/MDX/PlanBanner';

<PlanBanner plan="Scale" />

Common issues and solutions for the EventCatalog Slack Bot.

## Bot doesn't respond

### Check bot invitation

The bot must be invited to the channel where you're trying to use it.

**Solution:**
1. Navigate to the channel
2. Type `/invite @eventcatalog` (use your bot's actual name)
3. Try your question again

### Verify Socket Mode

Socket Mode must be enabled in your Slack app settings.

**Solution:**
1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your app
3. Click **Socket Mode** in the sidebar
4. Verify it's toggled to **On**
5. Restart the bot

### Check bot logs

Look for connection errors or startup issues.

**Solution:**

View logs based on how you're running the bot:

```bash
# Local development
# Check terminal output

# Docker
docker compose logs -f

# Docker (specific container)
docker logs eventcatalog-slack-bot
```

Look for error messages about:
- Missing credentials
- Connection failures
- License validation issues

## Missing API key error

The bot cannot find the API key for your configured AI provider.

**Solution:**

1. Check your `.env` file contains the correct variable:

```bash
# For Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# For OpenAI
OPENAI_API_KEY=sk-...

# For Google
GOOGLE_GENERATIVE_AI_API_KEY=...
```

2. Verify your config matches the environment variable:

```typescript
ai: {
  provider: 'anthropic', // Must match your API key
}
```

3. Restart the bot after adding the key

## MCP connection errors

The bot cannot connect to your EventCatalog MCP server.

### Verify EventCatalog URL

**Solution:**

1. Check your config has the correct URL:

```typescript
eventCatalog: {
  url: 'https://your-catalog.example.com',
}
```

2. Verify the URL is accessible from where the bot runs:

```bash
curl https://your-catalog.example.com/docs/mcp/
```

3. For Docker deployments, see [Docker networking](/docs/development/ask-your-architecture/slack-integration/deployment#docker-networking)

### Check MCP server status

**Solution:**

1. Visit your MCP endpoint in a browser:

```
https://your-catalog.example.com/docs/mcp/
```

2. You should see JSON output with available tools and resources
3. If you see an error, verify:
   - EventCatalog is running in [SSR mode](/docs/development/deployment/build-ssr-mode)
   - You have a valid [Scale license](https://eventcatalog.cloud)

### Authentication required

If your EventCatalog requires authentication, add headers to your config.

**Solution:**

```typescript
eventCatalog: {
  url: 'https://your-catalog.example.com',
  headers: {
    'Authorization': 'Bearer your-token',
  },
}
```

## Permission errors

The bot is missing required Slack permissions.

**Solution:**

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your app
3. Click **OAuth & Permissions**
4. Verify these **Bot Token Scopes** are added:
   - `app_mentions:read`
   - `chat:write`
   - `reactions:read`
   - `reactions:write`
   - `channels:history`
5. If you added new scopes, click **Reinstall to Workspace**
6. Restart the bot

## Auto-reply channels not working

The bot doesn't auto-reply in configured channels.

### Verify channel ID

**Solution:**

1. Get the correct channel ID:
   - Right-click channel name
   - Click **View channel details**
   - Scroll to bottom for Channel ID
2. Check your config uses the ID (not name):

```typescript
slack: {
  autoReplyChannels: ['C0123456789'], // Channel ID, not #channel-name
}
```

3. Restart the bot after changing config

### Check event subscription

**Solution:**

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your app
3. Click **Event Subscriptions**
4. Verify **Enable Events** is On
5. Check `message.channels` is in **Subscribe to bot events**

## Thread context not working

The bot doesn't remember previous messages in a thread.

### Public channels

Thread context should work automatically in public channels.

**Solution:**

1. Verify `channels:history` scope is added
2. Reinstall the app if you just added the scope
3. Restart the bot

### Private channels and DMs

Thread context requires additional scopes.

**Solution:**

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Select your app
3. Click **OAuth & Permissions**
4. Add these scopes:
   - `groups:history` - Private channels
   - `im:history` - Direct messages
   - `mpim:history` - Group DMs
5. Click **Reinstall to Workspace**
6. Restart the bot

## Docker networking issues

The bot cannot reach EventCatalog running on localhost.

**Solution:**

See the [Docker networking guide](/docs/development/ask-your-architecture/slack-integration/deployment#docker-networking) for detailed solutions based on your setup.

Quick fix for local EventCatalog:

```typescript
eventCatalog: {
  url: 'http://host.docker.internal:3000',
}
```

## License validation errors

The bot reports an invalid or expired license.

**Solution:**

1. Verify your license key is correct in `.env`:

```bash
EVENTCATALOG_SCALE_LICENSE_KEY=XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
```

2. Check your license status at [eventcatalog.cloud](https://eventcatalog.cloud)
3. For expired trials, upgrade to a paid plan
4. Restart the bot after updating the key

## Getting help

If you're still experiencing issues:

1. Check the bot logs for detailed error messages
2. Review the [GitHub repository](https://github.com/event-catalog/eventcatalog-slack-bot) for known issues
3. Join the [EventCatalog Discord](https://eventcatalog.dev/discord) for community support
4. File an issue on [GitHub](https://github.com/event-catalog/eventcatalog-slack-bot/issues) with:
   - Bot version
   - Error messages from logs
   - Steps to reproduce the issue
