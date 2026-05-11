---
id: cli-channels
title: Channels
sidebar_label: Channels
sidebar_position: 7
---

# Channels CLI Commands

Manage channels in your EventCatalog from the command line.

## getChannel

Returns a channel from EventCatalog by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the channel to retrieve |
| version | string | No | Specific version to retrieve |

**Examples:**

```bash
# Get the latest channel
npx @eventcatalog/cli getChannel "orders.events"

# Get a specific version
npx @eventcatalog/cli getChannel "orders.events" "1.0.0"
```

---

## getChannels

Returns all channels from EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| options | json | No | Options: &#123;latestOnly?&#125; |

**Examples:**

```bash
# Get all channels
npx @eventcatalog/cli getChannels
```

---

## writeChannel

Writes a channel to EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| channel | json | Yes | Channel object with id, name, version, and markdown |
| options | json | No | Options: &#123;path?, override?&#125; |



---

## rmChannel

Removes a channel by its path

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| path | string | Yes | Path to the channel |

**Examples:**

```bash
# Remove a channel
npx @eventcatalog/cli rmChannel "/orders.events"
```

---

## rmChannelById

Removes a channel by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the channel to remove |
| version | string | No | Specific version to remove |

**Examples:**

```bash
# Remove a channel
npx @eventcatalog/cli rmChannelById "orders.events"
```

---

## versionChannel

Moves the current channel to a versioned directory

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the channel to version |

**Examples:**

```bash
# Version a channel
npx @eventcatalog/cli versionChannel "orders.events"
```

---

## addEventToChannel

Adds an event to a channel

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| channelId | string | Yes | The ID of the channel |
| event | json | Yes | Event reference: &#123;id, version, parameters?&#125; |



---

## addCommandToChannel

Adds a command to a channel

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| channelId | string | Yes | The ID of the channel |
| command | json | Yes | Command reference: &#123;id, version, parameters?&#125; |



---

## addQueryToChannel

Adds a query to a channel

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| channelId | string | Yes | The ID of the channel |
| query | json | Yes | Query reference: &#123;id, version, parameters?&#125; |



---

## channelHasVersion

Checks if a specific version of a channel exists

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the channel |
| version | string | Yes | Version to check |

**Examples:**

```bash
# Check if version exists
npx @eventcatalog/cli channelHasVersion "orders.events" "1.0.0"
```

---
