---
id: cli-data-stores
title: Data Stores
sidebar_label: Data Stores
sidebar_position: 12
---

# Data Stores CLI Commands

Manage data stores in your EventCatalog from the command line.

## getDataStore

Returns a data store from EventCatalog by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the data store to retrieve |
| version | string | No | Specific version to retrieve |

**Examples:**

```bash
# Get the latest data store
npx @eventcatalog/cli getDataStore "orders-db"

# Get a specific version
npx @eventcatalog/cli getDataStore "orders-db" "1.0.0"
```

---

## getDataStores

Returns all data stores from EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| options | json | No | Options: &#123;latestOnly?&#125; |

**Examples:**

```bash
# Get all data stores
npx @eventcatalog/cli getDataStores
```

---

## writeDataStore

Writes a data store to EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| options | json | No | Options: &#123;path?, override?, versionExistingContent?&#125; |



---

## writeDataStoreToService

Writes a data store to a specific service

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| dataStore | json | Yes | Data store object |
| service | json | Yes | Service reference: &#123;id, version?&#125; |



---

## rmDataStore

Removes a data store by its path

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| path | string | Yes | Path to the data store |

**Examples:**

```bash
# Remove a data store
npx @eventcatalog/cli rmDataStore "/orders-db"
```

---

## rmDataStoreById

Removes a data store by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the data store to remove |
| version | string | No | Specific version to remove |

**Examples:**

```bash
# Remove a data store
npx @eventcatalog/cli rmDataStoreById "orders-db"
```

---

## versionDataStore

Moves the current data store to a versioned directory

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the data store to version |

**Examples:**

```bash
# Version a data store
npx @eventcatalog/cli versionDataStore "orders-db"
```

---

## addFileToDataStore

Adds a file to a data store

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the data store |
| file | json | Yes | File object: &#123;content, fileName&#125; |
| version | string | No | Specific version |



---

## dataStoreHasVersion

Checks if a specific version of a data store exists

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the data store |
| version | string | Yes | Version to check |

**Examples:**

```bash
# Check if version exists
npx @eventcatalog/cli dataStoreHasVersion "orders-db" "1.0.0"
```

---
