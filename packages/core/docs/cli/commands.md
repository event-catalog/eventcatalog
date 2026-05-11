---
id: cli-commands
title: Commands
sidebar_label: Commands
sidebar_position: 3
---

# Commands CLI Commands

Manage commands in your EventCatalog from the command line.

## getCommand

Returns a command from EventCatalog by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the command to retrieve |
| version | string | No | Specific version to retrieve (supports semver) |

**Examples:**

```bash
# Get the latest command
npx @eventcatalog/cli getCommand "CreateOrder"

# Get a specific version
npx @eventcatalog/cli getCommand "CreateOrder" "1.0.0"
```

---

## getCommands

Returns all commands from EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| options | json | No | Options: &#123;latestOnly?, attachSchema?&#125; |

**Examples:**

```bash
# Get all commands
npx @eventcatalog/cli getCommands
```

---

## writeCommand

Writes a command to EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| command | json | Yes | Command object with id, name, version, and markdown |
| options | json | No | Options: &#123;path?, override?, versionExistingContent?&#125; |



---

## writeCommandToService

Writes a command to a specific service

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| command | json | Yes | Command object |
| service | json | Yes | Service reference: &#123;id, version?&#125; |
| options | json | No | Options: &#123;path?, format?, override?&#125; |



---

## rmCommand

Removes a command by its path

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| path | string | Yes | Path to the command |

**Examples:**

```bash
# Remove a command
npx @eventcatalog/cli rmCommand "/CreateOrder"
```

---

## rmCommandById

Removes a command by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the command to remove |
| version | string | No | Specific version to remove |

**Examples:**

```bash
# Remove a command
npx @eventcatalog/cli rmCommandById "CreateOrder"
```

---

## versionCommand

Moves the current command to a versioned directory

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the command to version |

**Examples:**

```bash
# Version a command
npx @eventcatalog/cli versionCommand "CreateOrder"
```

---

## addFileToCommand

Adds a file to a command

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the command |
| file | json | Yes | File object: &#123;content, fileName&#125; |
| version | string | No | Specific version |



---

## addSchemaToCommand

Adds a schema to a command

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the command |
| schema | json | Yes | Schema object: &#123;schema, fileName&#125; |
| version | string | No | Specific version |



---

## commandHasVersion

Checks if a specific version of a command exists

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the command |
| version | string | Yes | Version to check |

**Examples:**

```bash
# Check if version exists
npx @eventcatalog/cli commandHasVersion "CreateOrder" "1.0.0"
```

---
