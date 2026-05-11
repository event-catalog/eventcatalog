---
id: cli-entities
title: Entities
sidebar_label: Entities
sidebar_position: 11
---

# Entities CLI Commands

Manage entities in your EventCatalog from the command line.

## getEntity

Returns an entity from EventCatalog by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the entity to retrieve |
| version | string | No | Specific version to retrieve |

**Examples:**

```bash
# Get the latest entity
npx @eventcatalog/cli getEntity "Order"

# Get a specific version
npx @eventcatalog/cli getEntity "Order" "1.0.0"
```

---

## getEntities

Returns all entities from EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| options | json | No | Options: &#123;latestOnly?&#125; |

**Examples:**

```bash
# Get all entities
npx @eventcatalog/cli getEntities
```

---

## writeEntity

Writes an entity to EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| entity | json | Yes | Entity object with id, name, version, and markdown |
| options | json | No | Options: &#123;path?, override?, versionExistingContent?&#125; |



---

## rmEntity

Removes an entity by its path

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| path | string | Yes | Path to the entity |

**Examples:**

```bash
# Remove an entity
npx @eventcatalog/cli rmEntity "/Order"
```

---

## rmEntityById

Removes an entity by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the entity to remove |
| version | string | No | Specific version to remove |

**Examples:**

```bash
# Remove an entity
npx @eventcatalog/cli rmEntityById "Order"
```

---

## versionEntity

Moves the current entity to a versioned directory

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the entity to version |

**Examples:**

```bash
# Version an entity
npx @eventcatalog/cli versionEntity "Order"
```

---

## entityHasVersion

Checks if a specific version of an entity exists

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the entity |
| version | string | Yes | Version to check |

**Examples:**

```bash
# Check if version exists
npx @eventcatalog/cli entityHasVersion "Order" "1.0.0"
```

---
