---
sidebar_position: 2
keywords:
- EventCatalog queries
sidebar_label: Create a query
title: Create a query
description: Creating and managing queries within EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PromptBox from '@site/src/components/MDX/PromptBox';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

A query documents a request for information. Use queries when one part of your architecture asks another part to return data without changing state (e.g GET request)

![Example](../../../img/queries/example.png)

## Adding a new query

### Automatic Creation

<PromptBox preview="Create a new EventCatalog query">
Read https://www.eventcatalog.dev/docs/development/guides/resources/messages/create-messages/create-query.md and https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/queries.md then help me create a new EventCatalog query in my catalog.

Ask me for the query name, what information it returns, summary, whether it belongs at the root of the catalog or inside a service, domain, or system, and any known callers, handlers, channels, HTTP operation details, or schema files. Then create the correct queries/{'{Query Name}'}/index.mdx, services/{'{Service Name}'}/queries/{'{Query Name}'}/index.mdx, domains/{'{Domain Name}'}/queries/{'{Query Name}'}/index.mdx, or domains/{'{Domain Name}'}/systems/{'{System Name}'}/services/{'{Service Name}'}/queries/{'{Query Name}'}/index.mdx file with frontmatter and starter markdown, you can add as much markdown as you want that captures the users input.

If the catalog does not have any services, domains, or systems, put it into the root queries folder.

You can also ask the user if they have a schema of the query, if they provide one, you can add this schema to the query, and set the schemaPath to that schema on the query frontmatter properties.

You can use MDX components found here https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/components.md
</PromptBox>

Copy this prompt and paste it into your coding agent. Your agent can help you choose where the query should live, create the right folder structure, and add the first version of the query documentation.

### Manual Creation

Queries live in a `/queries` folder. This folder can be placed:

- At the root of your catalog
- Inside a specific service folder

<ProjectTree
  items={[
    {
      name: 'queries',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'GetOrder',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'index.mdx', highlight: true }],
        },
      ],
    },
    {
      name: 'services',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'Orders',
          type: 'folder',
          defaultOpen: true,
          children: [
            {
              name: 'queries',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'GetOrder',
                  type: 'folder',
                  defaultOpen: true,
                  children: [{ name: 'index.mdx', highlight: true }],
                },
              ],
            },
          ],
        },
      ],
    },
  ]}
/>

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

## Assign services to your queries

To add services that invoke or accept your query you can read the [guide on adding messages to services](/docs/development/guides/resources/messages/connect-messages/map-producers-and-consumers).

You can also assign your query to one or more [channels](/docs/development/guides/resources/messages/message-channels/adding-messages-to-services) (e.g HTTP, GraphQL, etc).

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

When defined, the visualiser shows an HTTP method badge, the API path, and colored status code pills on the query node. See the [messages reference](/docs/development/guides/resources/messages/reference#operation) for all available options.

## Adding schemas to your query

You can add any schema format to your query, you can read the [guide on adding schemas to messages](/docs/development/guides/resources/schemas/add-schemas-to-messages).

