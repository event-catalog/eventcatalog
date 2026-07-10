---
sidebar_position: 2
sidebar_label: Adding resource-level documentation
title: Adding resource-level documentation
description: Place MDX files in a docs/ directory alongside any resource.
keywords:
  - EventCatalog resource docs
  - ADRs
  - runbooks
  - resource documentation
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PlanBanner from '@site/src/components/MDX/PlanBanner';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

<AddedIn version="3.15.0" />
<PlanBanner plan="Scale" />

## Adding resource-level documentation

Place `.mdx` files inside a `docs/` directory under any resource. EventCatalog will automatically pick them up and display them in the resource's sidebar.

<ProjectTree
  items={[
    {
      name: 'services',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'OrdersService',
          type: 'folder',
          defaultOpen: true,
          children: [
            { name: 'index.mdx' },
            {
              name: 'docs',
              type: 'folder',
              defaultOpen: true,
              children: [
                { name: '01-deployment.mdx', highlight: true },
                { name: '02-incident-response.mdx', highlight: true },
              ],
            },
          ],
        },
      ],
    },
  ]}
/>

### Frontmatter properties

Each doc file supports the following frontmatter.

| Property  | Required | Description                                      |
|-----------|----------|--------------------------------------------------|
| `title`   | No       | Display name of the doc. Defaults to the file name. |
| `summary` | No       | Short description shown below the title.        |
| `type`    | No       | Groups the doc in the sidebar. Defaults to the folder name, or `pages` if placed directly in `docs/`. |
| `version` | No       | Doc version. Defaults to the resource version.  |
| `order`   | No       | Explicit sort position within the group.        |
| `badges`  | No       | Badges shown on the doc page.                   |


#### Example of resource-level documentation

```mdx title="services/OrdersService/docs/01-deployment.mdx"
---
title: Deployment runbook
summary: Step-by-step guide for deploying the Orders service to production.
version: 1.0.0
---

## Pre-deployment checklist

1. Confirm staging tests pass.
2. Notify the on-call engineer.
...
```

### Order docs with numeric prefixes

Files are sorted alphabetically by default. Prefix the file name with a number to control the order.

<ProjectTree
  items={[
    {
      name: 'docs',
      type: 'folder',
      defaultOpen: true,
      children: [
        { name: '01-deployment.mdx', highlight: true },
        { name: '02-incident-response.mdx', highlight: true },
        { name: '03-disaster-recovery.mdx', highlight: true },
      ],
    },
  ]}
/>

The numeric prefix is stripped from the doc's ID and URL, so `01-deployment.mdx` is accessible at `.../pages/deployment`.

You can also set an explicit `order` value in frontmatter, which takes precedence over the numeric prefix.

### Use with domains and subdomains

Domains and subdomains follow the same pattern.

<ProjectTree
  items={[
    {
      name: 'domains',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'E-Commerce',
          type: 'folder',
          defaultOpen: true,
          children: [
            { name: 'index.mdx' },
            {
              name: 'docs',
              type: 'folder',
              defaultOpen: true,
              children: [{ name: '01-bounded-context.mdx', highlight: true }],
            },
            {
              name: 'subdomains',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'Orders',
                  type: 'folder',
                  defaultOpen: true,
                  children: [
                    { name: 'index.mdx' },
                    {
                      name: 'docs',
                      type: 'folder',
                      defaultOpen: true,
                      children: [{ name: '01-order-processing.mdx', highlight: true }],
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

## Navigate to a resource doc

Resource docs are served at:

```
http://localhost:3000/docs/{resourceType}/{resourceId}/{version}/{docType}/{docId}
```

For example, `01-deployment.mdx` for `OrdersService` version `1.0.0` would be at:

```
http://localhost:3000/docs/services/OrdersService/1.0.0/pages/deployment
```

## Grouping docs by type

Docs can be organised into groups using subdirectories inside `docs/`. Each subdirectory becomes a **doc type** and gets its own section in the resource sidebar.

<ProjectTree
  items={[
    {
      name: 'services',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'OrdersService',
          type: 'folder',
          defaultOpen: true,
          children: [
            { name: 'index.mdx' },
            {
              name: 'docs',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'adrs',
                  type: 'folder',
                  defaultOpen: true,
                  children: [{ name: '01-use-postgres.mdx', highlight: true }],
                },
                {
                  name: 'runbooks',
                  type: 'folder',
                  defaultOpen: true,
                  children: [
                    { name: '01-deployment.mdx', highlight: true },
                    { name: '02-incident-response.mdx', highlight: true },
                  ],
                },
                {
                  name: 'guides',
                  type: 'folder',
                  defaultOpen: true,
                  children: [{ name: 'on-call.mdx', highlight: true }],
                },
              ],
            },
          ],
        },
      ],
    },
  ]}
/>

The folder name is used as the group label by default. The built-in types `adrs`, `runbooks`, `contracts`, `troubleshooting`, and `guides` are automatically formatted with friendly labels in the sidebar.

You can override the type for any doc using the `type` frontmatter field, regardless of which folder it lives in:

```mdx title="services/OrdersService/docs/adrs/01-use-postgres.mdx"
---
title: Use PostgreSQL for order storage
type: architecture-records
---
```

The type resolution order is:

1. `type` frontmatter — takes highest precedence
2. Folder name — used when `type` is not set
3. `pages` — fallback when the doc is placed directly in `docs/` with no subfolder
