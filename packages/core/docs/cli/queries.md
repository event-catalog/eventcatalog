---
id: cli-queries
title: Queries
sidebar_label: Queries
sidebar_position: 4
---

# Queries CLI Commands

Manage queries in your EventCatalog from the command line.

## getQuery

Returns a query from EventCatalog by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the query to retrieve |
| version | string | No | Specific version to retrieve |

**Examples:**

```bash
# Get the latest query
npx @eventcatalog/cli getQuery "GetOrder"

# Get a specific version
npx @eventcatalog/cli getQuery "GetOrder" "1.0.0"
```

---

## getQueries

Returns all queries from EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| options | json | No | Options: &#123;latestOnly?, attachSchema?&#125; |

**Examples:**

```bash
# Get all queries
npx @eventcatalog/cli getQueries
```

---

## writeQuery

Writes a query to EventCatalog

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| query | json | Yes | Query object with id, name, version, and markdown |
| options | json | No | Options: &#123;path?, override?, versionExistingContent?&#125; |



---

## writeQueryToService

Writes a query to a specific service

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| query | json | Yes | Query object |
| service | json | Yes | Service reference: &#123;id, version?&#125; |
| options | json | No | Options: &#123;path?, format?, override?&#125; |



---

## rmQuery

Removes a query by its path

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| path | string | Yes | Path to the query |

**Examples:**

```bash
# Remove a query
npx @eventcatalog/cli rmQuery "/GetOrder"
```

---

## rmQueryById

Removes a query by its ID

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the query to remove |
| version | string | No | Specific version to remove |

**Examples:**

```bash
# Remove a query
npx @eventcatalog/cli rmQueryById "GetOrder"
```

---

## versionQuery

Moves the current query to a versioned directory

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the query to version |

**Examples:**

```bash
# Version a query
npx @eventcatalog/cli versionQuery "GetOrder"
```

---

## addFileToQuery

Adds a file to a query

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the query |
| file | json | Yes | File object: &#123;content, fileName&#125; |
| version | string | No | Specific version |



---

## addSchemaToQuery

Adds a schema to a query

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the query |
| schema | json | Yes | Schema object: &#123;schema, fileName&#125; |
| version | string | No | Specific version |



---

## queryHasVersion

Checks if a specific version of a query exists

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the query |
| version | string | Yes | Version to check |

**Examples:**

```bash
# Check if version exists
npx @eventcatalog/cli queryHasVersion "GetOrder" "1.0.0"
```

---
