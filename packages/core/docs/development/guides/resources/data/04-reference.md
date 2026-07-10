---
keywords:
- EventCatalog data stores
- Data store frontmatter
sidebar_label: Reference
title: Data stores reference
description: Frontmatter fields, paths, and routes for data stores in EventCatalog.
---

This page lists the fields, paths, and routes supported by data stores.

## Paths

Data stores use the `containers` collection.

```txt
/containers/{Data Store Name}/index.mdx
/services/{Service Name}/containers/{Data Store Name}/index.mdx
/systems/{System Name}/containers/{Data Store Name}/index.mdx
```

Versioned data stores use:

```txt
/containers/{Data Store Name}/versioned/{version}/index.mdx
```

## Routes

| Route | Description |
|-------|-------------|
| `/docs/containers/{container-id}/{version}` | Data store documentation page. |
| `/visualiser/containers/{container-id}/{version}` | Data store resource diagram. |

## Required fields

### `id` {#id}

- Type: `string`

Unique id of the data store. EventCatalog uses this for URLs and resource references.

```md title="Example"
---
id: orders-database
---
```

### `name` {#name}

- Type: `string`

Display name of the data store.

```md title="Example"
---
name: Orders Database
---
```

### `version` {#version}

- Type: `string`

Version of the data store documentation.

```md title="Example"
---
version: 1.0.0
---
```

## Optional fields

### `summary` {#summary}

- Type: `string`

Short description of the data store.

```md title="Example"
---
summary: Stores order state and fulfilment status.
---
```

### `container_type` {#container_type}

- Type: `database`, `cache`, `objectStore`, `searchIndex`, `dataWarehouse`, `dataLake`, `externalSaaS`, or `other`

Type of data store.

```md title="Example"
---
container_type: database
---
```

### `technology` {#technology}

- Type: `string`

Technology used by the data store.

```md title="Example"
---
technology: PostgreSQL
---
```

### `authoritative` {#authoritative}

- Type: `boolean`

Marks this data store as an authoritative source of data.

```md title="Example"
---
authoritative: true
---
```

### `access_mode` {#access_mode}

- Type: `read`, `write`, `readWrite`, or `appendOnly`

How consumers interact with the data store.

```md title="Example"
---
access_mode: readWrite
---
```

### `classification` {#classification}

- Type: `public`, `internal`, `confidential`, or `regulated`

Data classification.

```md title="Example"
---
classification: confidential
---
```

### `residency` {#residency}

- Type: `string`

Region or residency information.

```md title="Example"
---
residency: eu-west-1
---
```

### `retention` {#retention}

- Type: `string`

Retention policy or duration.

```md title="Example"
---
retention: 7 years
---
```

### `owners` {#owners}

- Type: `array`

An array of team or user ids that own the data store.

```md title="Example"
---
owners:
  - data-platform
---
```

### `services` {#services}

- Type: `array`

Services associated with the data store.

```md title="Example"
---
services:
  - id: order-service
    version: 1.0.0
---
```

### `badges` {#badges}

- Type: `array`

Badges rendered on the data store page.

```md title="Example"
---
badges:
  - content: Authoritative
    backgroundColor: green
    textColor: green
---
```
