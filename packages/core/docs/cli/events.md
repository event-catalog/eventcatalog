---
id: cli-events
title: Events
sidebar_label: Events
sidebar_position: 2
---

# Events CLI Commands

Manage events in your EventCatalog from the command line.

## getEvent

Returns an event from EventCatalog by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the event to retrieve |
| version | string | No | Specific version to retrieve (supports semver) |
| options | json | No | Options object, e.g. &#123;"attachSchema": true&#125; |

**Examples:**

```bash
# Get the latest version of an event
npx @eventcatalog/cli getEvent "OrderCreated"

# Get a specific version
npx @eventcatalog/cli getEvent "OrderCreated" "1.0.0"
```

---

## getEvents

Returns all events from EventCatalog

**Arguments:** None

**Examples:**

```bash
# Get all events
npx @eventcatalog/cli getEvents
```

---

## writeEvent

Writes an event to EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| event | json | Yes | Event object with id, name, version, and markdown |



---

## writeEventToService

Writes an event to a specific service in EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| event | json | Yes | Event object with id, name, version, and markdown |
| service | json | Yes | Service reference: &#123;id, version?&#125; |
| options | json | No | Options: &#123;path?, format?, override?&#125; |



---

## rmEvent

Removes an event by its path

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| path | string | Yes | Path to the event, e.g. /InventoryAdjusted |

**Examples:**

```bash
# Remove an event by path
npx @eventcatalog/cli rmEvent "/InventoryAdjusted"
```

---

## rmEventById

Removes an event by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the event to remove |
| version | string | No | Specific version to remove |

**Examples:**

```bash
# Remove latest version
npx @eventcatalog/cli rmEventById "OrderCreated"

# Remove specific version
npx @eventcatalog/cli rmEventById "OrderCreated" "1.0.0"
```

---

## versionEvent

Moves the current event to a versioned directory

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the event to version |

**Examples:**

```bash
# Version an event
npx @eventcatalog/cli versionEvent "OrderCreated"
```

---

## addFileToEvent

Adds a file to an event

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the event |
| file | json | Yes | File object: &#123;content, fileName&#125; |
| version | string | No | Specific version to add file to |



---

## addSchemaToEvent

Adds a schema file to an event

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the event |
| schema | json | Yes | Schema object: &#123;schema, fileName&#125; |
| version | string | No | Specific version to add schema to |



---

## eventHasVersion

Checks if a specific version of an event exists

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the event |
| version | string | Yes | Version to check (supports semver) |

**Examples:**

```bash
# Check if version exists
npx @eventcatalog/cli eventHasVersion "OrderCreated" "1.0.0"

# Check with semver range
npx @eventcatalog/cli eventHasVersion "OrderCreated" "1.0.x"
```

---
