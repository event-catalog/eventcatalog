---
sidebar_position: 5
sidebar_label: Data API
title: Data frontmatter API
description: Understanding the API for data.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.59.0" />

## Overview {#overview}

[Data stores](/docs/development/guides/data/introduction) are just markdown files, with this comes the use of Content, MDX components and also [front-matter](https://jekyllrb.com/docs/front-matter/).

Here is an example of of a basic data store.

```md title="/services/OrdersService/containers/OrdersDatabase/index.mdx (example)"
---
# id of your data store, used for slugs and references in EventCatalog.
id: orders-db
# Display name of the data store, rendered in EventCatalog.
name: Orders DB
# Version of the data store
version: 1.0.0
# Type of the data store (e.g. database, cache, objectStore, searchIndex)
container_type: database
# Technology of the data store (e.g. postgres@14, redis@7, etc)
technology: postgres@14
# Classification of the data store (e.g. internal, external, etc)
classification: internal
# Retention of the data store (e.g. 7y, 10y, etc)
retention: 7y
# Residency of the data store (e.g. eu-west-1, us-east-1, etc)
residency: eu-west-1
# Badges to display
badges:
  - content: "Core Data Store"
    backgroundColor: "blue"
    textColor: "white"
---

The orders database is a core data store for the orders domain.

<!-- Add any markdown you want, the data store will render in its own page /docs/containers/{Data Store}/{version} -->
```

## Required fields {#required-fields}

### `id` {#id}

- Type: `string`

Unique id of the data store. EventCatalog uses this for references and slugs.

```mdx title="Example"
---
  id: orders-db
---
```

### `name` {#name}

- Type: `string`

Name of the data store this is used to display the name on the UI.

```mdx title="Example"
---
  name: Orders DB
---
```

### `version` {#version}

- Type: `string`

Version of the data store. 

```mdx title="Example"
---
  version: 0.0.1
---
```

<!-- // 1) Put this near your other enums/utilities
const containerTypeEnum = z.enum([
  // Core
  'database',
  'cache',
  'objectStore',
  'searchIndex',
  'dataWarehouse',
  'dataLake',
  'externalSaaS',
  // Fallback
  'other',
]); -->

<!-- const accessModeEnum = z.enum(['read', 'write', 'readWrite', 'appendOnly']);
const dataClassificationEnum = z.enum(['public', 'internal', 'confidential', 'regulated']);

const containers = defineCollection({
  loader: glob({
    pattern: ['**/containers/*/index.(md|mdx)', '**/containers/*/versioned/*/index.(md|mdx)'],
    base: projectDirBase,
    generateId: ({ data }) => {
      return `${data.id}-${data.version}`;
    },
  }),
  schema: z
    .object({
      container_type: containerTypeEnum, // <— the important discriminator inside DataContainer
      technology: z.string().optional(), // e.g. "postgres@14", "kafka", "s3"
      authoritative: z.boolean().optional().default(false),
      access_mode: accessModeEnum.optional(), // read/write/readWrite/appendOnly
      classification: dataClassificationEnum.optional(),
      residency: z.string().optional(),
      retention: z.string().optional(),
      // details panel toggles (aligns with your pattern)
      detailsPanel: z
        .object({
          versions: detailPanelPropertySchema.optional(),
          repository: detailPanelPropertySchema.optional(),
          owners: detailPanelPropertySchema.optional(),
          changelog: detailPanelPropertySchema.optional(),
          attachments: detailPanelPropertySchema.optional(),
        })
        .optional(),
      services: z.array(reference('services')).optional(),

      servicesThatWriteToContainer: z.array(reference('services')).optional(),
      servicesThatReadFromContainer: z.array(reference('services')).optional(),
    })
    .merge(baseSchema),
}); -->


### `container_type` {#container_type}

- Type: `string`

Type of the data store.

```mdx title="Example"
---
  container_type: database
---
```

Options: `database`, `cache`, `objectStore`, `searchIndex`, `dataWarehouse`, `dataLake`, `other`

## Optional fields {#optional-fields}

### `summary` {#summary}

Short summary of your data store, shown on data store summary pages.

```mdx title="Example"
---
  summary: |
    Orders database is a core data store for the orders domain.
---
```

### `technology` {#technology}

- Type: `string`

Technology of the data store.
```mdx title="Example"
---
  technology: postgres@14
---
```

### `classification` {#classification}

- Type: `string`

Classification of the data store.
```mdx title="Example"
---
  classification: internal
---
```

Options: `internal`, `external`, `confidential`, `regulated`

### `retention` {#retention}

- Type: `string`

Retention of the data store.
```mdx title="Example"
---
  retention: 7y
---
```

### `residency` {#residency}

- Type: `string`

Residency of the data store.
```mdx title="Example"
---
  residency: eu-west-1
---
```

### `detailsPanel` {#detailsPanel}

<AddedIn version="2.53.0" />

Override the default details panel for the page. You can use this show/hide areas of the details panel.

![Details panel](./img/domain-details-panel.png)

```mdx title="Example"
---
  detailsPanel:
    versions:
      visible: false
    owners:
      visible: false
---
```

Options:

| Property | Type | Required | Description |
| -------- | -------- | -------- | -------- |
| `versions` | `object` | No | An object with a `visible` property to show/hide the versions section |  
| `changelog` | `object` | No | An object with a `visible` property to show/hide the changelog button |  
| `owners` | `object` | No | An object with a `visible` property to show/hide the owners section |  
| `attachments` | `object` | No | An object with a `visible` property to show/hide the attachments section |  
| `repository` | `object` | No | An object with a `visible` property to show/hide the repository section |  

### `attachments` {#attachments}

An array of attachments for this resource type.

```mdx title="Example"
---
  attachments:
    - url: https://example.com/erd/orders-database.png
      title: ERD for Orders Database
      description: Learn more about the ERD for the Orders Database.
      type: 'architecture-decisions'
      icon: FileTextIcon
---

```

Options:

The attachments can be a url (string) or an object with additional properties.

Object properties:

| Property | Type | Required | Description |
| -------- | -------- | -------- | -------- |
| `url` | `string` | Yes | The url of the attachment |
| `title` | `string` | optional | The title of the attachment |
| `description` | `string` | optional | The description of the attachment |
| `type` | `string` | optional | The type of the attachment, this will be used to group attachments together in the UI |
| `icon` | `string` | optional | The icon of the attachment, you can pick from the [lucide icons](https://lucide.dev/icons/) library. |