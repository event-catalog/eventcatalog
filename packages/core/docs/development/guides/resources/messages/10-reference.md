---
keywords:
- EventCatalog messages
- Message frontmatter
sidebar_label: Reference
sidebar_position: 8
title: Messages reference
description: Frontmatter fields, paths, and routes for events, commands, and queries in EventCatalog.
---

import ProjectTree from '@site/src/components/MDX/ProjectTree';

This page lists the fields, paths, and routes supported by messages.

Messages are modeled as three collections:

- `events`
- `commands`
- `queries`

## Paths

Messages can be created at the root of their collection:

<ProjectTree
  items={[
    {
      name: 'events',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: '{Event Name}',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'index.mdx', highlight: true }],
        },
      ],
    },
    {
      name: 'commands',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: '{Command Name}',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'index.mdx', highlight: true }],
        },
      ],
    },
    {
      name: 'queries',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: '{Query Name}',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'index.mdx', highlight: true }],
        },
      ],
    },
  ]}
/>

Messages can also be created inside domains, systems, and services:

<ProjectTree
  items={[
    {
      name: 'domains',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: '{Domain Name}',
          type: 'folder',
          defaultOpen: true,
          children: [
            {
              name: 'events',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: '{Event Name}',
                  type: 'folder',
                  defaultOpen: true,
                  children: [{ name: 'index.mdx', highlight: true }],
                },
              ],
            },
            {
              name: 'systems',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: '{System Name}',
                  type: 'folder',
                  defaultOpen: true,
                  children: [
                    {
                      name: 'services',
                      type: 'folder',
                      defaultOpen: true,
                      children: [
                        {
                          name: '{Service Name}',
                          type: 'folder',
                          defaultOpen: true,
                          children: [
                            {
                              name: 'commands',
                              type: 'folder',
                              defaultOpen: true,
                              children: [
                                {
                                  name: '{Command Name}',
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
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'systems',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: '{System Name}',
          type: 'folder',
          defaultOpen: true,
          children: [
            {
              name: 'services',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: '{Service Name}',
                  type: 'folder',
                  defaultOpen: true,
                  children: [
                    {
                      name: 'events',
                      type: 'folder',
                      defaultOpen: true,
                      children: [
                        {
                          name: '{Event Name}',
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
          ],
        },
      ],
    },
  ]}
/>

Versioned messages use:

<ProjectTree
  items={[
    {
      name: 'events',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: '{Message Name}',
          type: 'folder',
          defaultOpen: true,
          children: [
            {
              name: 'versioned',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: '{version}',
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

## Routes

| Route | Description |
|-------|-------------|
| `/docs/events/{event-id}/{version}` | Event documentation page. |
| `/docs/commands/{command-id}/{version}` | Command documentation page. |
| `/docs/queries/{query-id}/{version}` | Query documentation page. |
| `/visualiser/events/{event-id}/{version}` | Event resource diagram. |
| `/visualiser/commands/{command-id}/{version}` | Command resource diagram. |
| `/visualiser/queries/{query-id}/{version}` | Query resource diagram. |

## Required fields

### `id` {#id}

- Type: `string`

Unique id of the message. EventCatalog uses this for URLs and resource references.

```md title="Example"
---
id: OrderCreated
---
```

### `name` {#name}

- Type: `string`

Display name of the message.

```md title="Example"
---
name: Order Created
---
```

### `version` {#version}

- Type: `string`

Version of the message documentation.

```md title="Example"
---
version: 1.0.0
---
```

## Optional fields

### `summary` {#summary}

- Type: `string`

Short summary of what the message represents.

```md title="Example"
---
summary: Published when an order has been accepted.
---
```

### `owners` {#owners}

- Type: `array`

An array of team or user ids that own the message.

```md title="Example"
---
owners:
  - ordering-platform
---
```

### `schemaPath` {#schemaPath}

- Type: `string`

Path to the message schema.

```md title="Example"
---
schemaPath: schema.json
---
```

### `schemas` {#schemas}

- Type: `array`

Schema references associated with the message.

```md title="Example"
---
schemas:
  - path: schema.json
    name: JSON schema
    format: jsonschema
---
```

### `channels` {#channels}

- Type: `array`

Inline channel references for the message.

```md title="Example"
---
channels:
  - id: orders-topic
    address: orders.events
    protocol: kafka
---
```

### `operation` {#operation}

- Type: `object`

HTTP operation metadata shown on the visualizer node.

```md title="Example"
---
operation:
  method: POST
  path: /orders
  statusCodes:
    - "201"
    - "400"
---
```


### `badges` {#badges}

- Type: `array`

Badges rendered on the message page.

```md title="Example"
---
badges:
  - content: Public event
    backgroundColor: green
    textColor: green
---
```

### `repository` {#repository}

- Type: `object`

Repository metadata for the message.

```md title="Example"
---
repository:
  language: TypeScript
  url: https://github.com/acme/orders
---
```

### `attachments` {#attachments}

- Type: `array`

External links or supporting documents attached to the message.

```md title="Example"
---
attachments:
  - title: Event contract review
    url: https://docs.example.com/order-created-review
    type: document
---
```

## Operation fields

Use `operation` to document HTTP metadata for an event, command, or query.

```md
---
operation:
  method: POST
  path: /orders
  statusCodes:
    - "201"
    - "400"
---
```

| Field | Type | Description |
|-------|------|-------------|
| `method` | `GET`, `POST`, `PUT`, `DELETE`, `PATCH` | HTTP method for the operation. |
| `path` | `string` | API path for the operation. |
| `statusCodes` | `array` | HTTP status codes the operation may return. |

## Schema examples

Use `schemaPath` to attach a schema to the message.

```md
---
schemaPath: schema.json
---
```

You can also use schema references when a message has multiple schemas or named schemas.

```md
---
schemas:
  - path: schema.json
    name: JSON schema
    format: jsonschema
---
```
