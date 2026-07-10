---
sidebar_position: 5
keywords:
- Slack Bot
- Usage
sidebar_label: Using the bot
title: Using the bot
description: Query architecture documentation from Slack
---

import PlanBanner from '@site/src/components/MDX/PlanBanner';

<PlanBanner plan="Scale" />

Interact with the EventCatalog Slack Bot to query your architecture documentation. The bot responds to @mentions and can auto-reply in dedicated channels.

## @Mention in any channel

Invite the bot to any channel and @mention it to ask questions. The bot replies in a thread to keep channels organized.

### Example questions

```
@eventcatalog Tell me about the OrderCreated event
```

```
@eventcatalog What services consume the InventoryUpdated event?
```

```
@eventcatalog List all events in the Orders domain
```

```
@eventcatalog Show me the schema for the PaymentProcessed event
```

The bot reads your EventCatalog documentation and provides detailed answers grounded in your architecture.

## Dedicated auto-reply channels

Create a channel where the bot automatically responds to every message - no @mention needed. This gives your team a dedicated space for architecture questions.

### Setup

1. Create a new channel (e.g., `#ask-eventcatalog` or `#ask-eda`)
2. Invite the bot to the channel
3. Get the channel ID:
   - Right-click the channel name
   - Click **View channel details**
   - Scroll to the bottom to find the Channel ID
4. Add the channel ID to your config:

```typescript
slack: {
  autoReplyChannels: ['C0123456789'],
}
```

5. Restart the bot

Now anyone can post questions directly in the channel and receive instant answers.

### Multiple channels

Configure multiple auto-reply channels:

```typescript
slack: {
  autoReplyChannels: ['C0123456789', 'C9876543210'],
}
```

## Thread context

The bot automatically reads conversation history in threads. This enables natural follow-up questions without repeating context.

### Example conversation

**User:** Tell me about the OrderCreated event

**Bot:** The OrderCreated event is published when...

**User:** What are its consumers?

**Bot:** Based on our earlier discussion about OrderCreated, the consumers are...

**User:** Show me the schema

**Bot:** Here's the schema for OrderCreated...

Thread context works automatically in public channels. For private channels and DMs, add optional scopes to your Slack app:

- `groups:history` - Private channels
- `im:history` - Direct messages
- `mpim:history` - Group DMs

After adding scopes, reinstall the app to your workspace.

## Best practices

### Ask specific questions

The bot performs best with clear, specific questions:

**Good:**
- "What services consume the OrderCreated event?"
- "Show me all events in the Payment domain"
- "What's the schema format for UserRegistered?"

**Less effective:**
- "Tell me about everything"
- "What does this system do?"

### Use thread conversations

Keep related questions in the same thread. The bot uses thread history to provide better context-aware answers.

### Name resources clearly

Mention specific event names, service names, or domain names to get precise answers:

- "Tell me about the **OrderCreated** event"
- "What events does the **PaymentService** produce?"
- "List all events in the **Orders** domain"

## Invite the bot to channels

The bot can only see messages in channels where it's invited.

### Invite the bot

1. Navigate to the channel
2. Click the channel name at the top
3. Click the **Integrations** tab
4. Click **Add an app**
5. Search for your bot and add it

Alternatively, type `/invite @eventcatalog` in the channel.
