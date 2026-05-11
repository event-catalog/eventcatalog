---
sidebar_position: 2
keywords:
- EventCatalog queries
sidebar_label: Creating a query
title: Creating queries
description: Creating and managing queries within EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

Queries live in a `/queries` folder. This folder can be placed:

- At the root of your catalog, or
  - `/queries/{Query Name}/index.mdx` 
- Inside a specific service folder.
  - `/services/{Service Name}/queries/{Query Name}/index.mdx` 

The contents are split into two sections, **frontmatter** and the **markdown content**.

_Here is an example of what a query markdown file may look like._

```md title="/queries/GetOrder/index.mdx (example)"
---
# id of your query, used for slugs and references in EventCatalog.
id: GetOrder

# Display name of the query, rendered in EventCatalog
name: Get Order

# Version of the query
version: 0.0.4

# Short summary of your query
summary: |
    Query with the intent to get an order from the system

# Optional owners, references teams or users
owners:
    - dboyne

# Optional badges, rendered to UI by EventCatalog
badges:
    - content: New service
      backgroundColor: blue
      textColor: blue
---

## Overview

The `GetOrder` query represents intent to get an order from the system.

<NodeGraph />

```

Once this file is added, the query will automatically appear across EventCatalog.

## Writing query content

You can write any Markdown inside a query. 

Each query gets its own page, so use this space to fully explain how it works.

You can also use [interactive components](/docs/development/components/using-components) to enrich your documentation.

## Assign services to your queries

To add services that invoke or accept your query you can read the [guide on adding messages to services](/docs/development/guides/messages/common/map-to-producers-and-consumers).

You can also assign your query to one or more [channels](/docs/development/guides/channels/adding-messages-to-services) (e.g HTTP, GraphQL, etc).

<AddedIn version="3.18.0" />

## Document an HTTP operation

If your query maps to an HTTP endpoint, use the `operation` field to document the method, path, and expected status codes.

```md title="/queries/GetOrder/index.mdx (example)"
---
id: GetOrder
# ...
operation:
  method: GET
  path: /orders/{id}
  statusCodes:
    - "200"
    - "404"
---
```

When defined, the visualiser shows an HTTP method badge, the API path, and colored status code pills on the query node. See the [query API reference](/docs/api/query-api#operation) for all available options.

## Adding schemas to your query

You can add any schema format to your query, you can read the [guide on adding schemas to messages](/docs/development/guides/messages/common/adding-schemas).

## What should I document?

There’s no strict structure, but consider including:

- Purpose – What does this query do and why does it exist?
- How to trigger it – APIs, SDKs, or UI actions
- Schema – Payload structure and validation rules
- Ownership – Who maintains this query?
- Contributing – How others can propose changes

## Custom icon

<AddedIn version="3.28.1" />

Set `styles.icon` in your frontmatter to display a custom icon on the query. The icon appears in the visualiser node, sidebar navigation, page header, and search results.

```md title="/queries/GetOrder/index.mdx (example)"
---
id: GetOrder
name: Get Order
version: 0.0.4
styles:
  icon: /icons/query/search.svg
---
```

The value can be a path to a file in your catalog's `public/` folder (e.g. `/icons/query/search.svg`) or an absolute URL (e.g. `https://cdn.simpleicons.org/graphql`).

## How do queries appear in EventCatalog?

![Example](../../img/queries/example.png)


