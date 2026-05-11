---
sidebar_position: 2
keywords:
- Slack Bot
- Slack App
sidebar_label: Slack app setup
title: Slack app setup
description: Create and configure your Slack app
---

import PlanBanner from '@site/src/components/MDX/PlanBanner';

<PlanBanner plan="Scale" />

Create a Slack app to enable the EventCatalog bot in your workspace. You can create the app using a manifest (recommended) or manually configure all settings.

## Create from manifest (recommended)

The fastest way to get started. The manifest automatically configures all required permissions and settings.

### Steps

1. Navigate to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From an app manifest**
3. Select your workspace and click **Next**
4. Choose **YAML** and paste this manifest:

```yaml
display_information:
  name: EventCatalog Bot
  description: Query your EventCatalog directly from Slack
  background_color: "#000000"

features:
  bot_user:
    display_name: EventCatalog
    always_online: true

oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - chat:write
      - reactions:read
      - reactions:write
      - channels:history

settings:
  event_subscriptions:
    bot_events:
      - app_mention
      - message.channels
  interactivity:
    is_enabled: false
  org_deploy_enabled: false
  socket_mode_enabled: true
  token_rotation_enabled: false
```

5. Click **Next**, review the summary, and click **Create**

### Get credentials

After creating the app, collect three credentials needed to run the bot.

#### App-Level Token

1. Go to **Basic Information** → **App-Level Tokens**
2. Click **Generate Token and Scopes**
3. Name: `socket-mode-token`
4. Add scope: `connections:write`
5. Click **Generate** and copy the token (starts with `xapp-`)
6. Save this as `SLACK_APP_TOKEN`

#### Bot Token

1. Go to **OAuth & Permissions**
2. Click **Install to Workspace**
3. Review permissions and click **Allow**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
5. Save this as `SLACK_BOT_TOKEN`

#### Signing Secret

1. Go to **Basic Information** → **App Credentials**
2. Copy the **Signing Secret**
3. Save this as `SLACK_SIGNING_SECRET`

<details>
<summary>Setup Slack app manually</summary>

If you prefer to configure settings yourself, follow these steps.

### Create the app

1. Navigate to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Name your app (e.g., "EventCatalog Bot") and select your workspace
4. Click **Create App**

### Enable Socket Mode

1. Click **Socket Mode** in the left sidebar
2. Toggle **Enable Socket Mode** to On
3. Create an App-Level Token when prompted:
   - Name: `socket-mode-token`
   - Scope: `connections:write`
4. Click **Generate**
5. Copy the token (starts with `xapp-`) - this is `SLACK_APP_TOKEN`

### Configure permissions

1. Click **OAuth & Permissions** in the left sidebar
2. Scroll to **Scopes** → **Bot Token Scopes**
3. Add these scopes:
   - `app_mentions:read` - Receive @mention events
   - `chat:write` - Send messages
   - `reactions:read` - Read reactions
   - `reactions:write` - Add and remove reactions
   - `channels:history` - Read public channel messages

### Enable events

1. Click **Event Subscriptions** in the left sidebar
2. Toggle **Enable Events** to On
3. Expand **Subscribe to bot events**
4. Add these events:
   - `app_mention`
   - `message.channels`

### Install the app

1. Click **OAuth & Permissions** in the left sidebar
2. Click **Install to Workspace**
3. Review permissions and click **Allow**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`) - this is `SLACK_BOT_TOKEN`

### Get signing secret

1. Click **Basic Information** in the left sidebar
2. Scroll to **App Credentials**
3. Copy the **Signing Secret** - this is `SLACK_SIGNING_SECRET`

</details>

## Optional: Private channels and DMs

By default, the bot only reads thread context in public channels. To enable thread context in private channels and DMs, add these additional scopes:

- `groups:history` - Private channels
- `im:history` - Direct messages
- `mpim:history` - Group DMs

After adding scopes, reinstall the app to your workspace.
