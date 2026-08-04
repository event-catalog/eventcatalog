---
sidebar_position: 98
keywords:
- versioning
- resources
- EventCatalog
sidebar_label: Versioning resources
title: Versioning resources
description: Learn how versioning works for EventCatalog resources.
---

import ProjectTree from '@site/src/components/MDX/ProjectTree';

EventCatalog resources can be versioned when you want to preserve how a resource looked at a point in time.

Use versioning when a resource changes in a way that people may need to understand later, such as a service contract change, a message payload change, a domain boundary change, or a new major version of a system capability.

## How versioning works

The latest version of a resource lives in the normal resource folder.

Older versions live inside a `versioned` folder under that resource. Each version has its own folder and its own `index.mdx` file.

For example, a versioned service looks like this:

<ProjectTree
  items={[
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
            { name: 'index.mdx', highlight: true },
            {
              name: 'versioned',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: '1.0.0',
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

The root `index.mdx` is the current version. The file in `versioned/1.0.0/index.mdx` is the historical version.

## Create a new version

To create a new version:

1. Copy the current resource into a new folder under `versioned/{version}`.
2. Keep the copied file at the old version number.
3. Update the root resource to the new version number.
4. Update the root resource content to describe the latest state.

For example, before changing `Orders` from `1.0.0` to `2.0.0`, copy the current file into `versioned/1.0.0/index.mdx`.

```md title="/services/Orders/versioned/1.0.0/index.mdx"
---
id: Orders
name: Orders
version: 1.0.0
summary: Handles order placement and order history.
---

## Overview

This is the original Orders service documentation.
```

Then update the root file:

```md title="/services/Orders/index.mdx"
---
id: Orders
name: Orders
version: 2.0.0
summary: Handles order placement, order history, and order amendments.
---

## Overview

This is the latest Orders service documentation.
```

## Versioned URLs

EventCatalog creates versioned pages for resources that have versions.

For example:

| Resource | URL |
|----------|-----|
| Latest `Orders` service | `/docs/services/Orders` |
| `Orders` service version `1.0.0` | `/docs/services/Orders/1.0.0` |

This lets users compare the current resource with previous versions when they need historical context.

## Referencing versions

When one resource references another resource, you can include a `version` field when you want to point to a specific version.

```md title="/services/Payments/index.mdx"
---
id: Payments
name: Payments
version: 1.0.0

receives:
  - id: OrderPlaced
    version: 1.0.0
---
```

Use a specific version when the relationship depends on that version of the resource.

Leave the version out when the relationship should point to the latest version.

```md title="/services/Payments/index.mdx"
---
id: Payments
name: Payments
version: 1.0.0

receives:
  - id: OrderPlaced
---
```

## What can be versioned?

You can version the resources you document in EventCatalog, including:

- Domains
- Systems
- Services
- Messages
- Schemas and specifications
- Data stores
- Data products
- Entities
- Flows
- Agents
- Architecture decision records

The folder location changes by resource type, but the pattern is the same: keep the latest resource in the root folder and store older versions under `versioned/{version}`.

## Version numbers

EventCatalog does not force a specific versioning strategy. Most teams use semantic versioning:

| Version change | Use when |
|----------------|----------|
| Patch | Fixing documentation, examples, or non-behavioral details |
| Minor | Adding fields, endpoints, resources, or capabilities in a backwards-compatible way |
| Major | Removing or changing behavior, contracts, fields, routes, or ownership in a breaking way |

The important part is consistency. Pick a convention your team understands and apply it across the catalog.

## Versioning and changelogs

Versioning preserves the old state of a resource. Changelogs explain why the resource changed.

Use both when the change needs context. For example, a service can have version `2.0.0` and a changelog entry explaining that the service started publishing a new event or removed an old endpoint.

## When to version

Version resources when the old state still matters.

Good examples include:

- A breaking API or schema change.
- A message contract changing.
- A service or system taking on a new responsibility.
- A domain boundary changing.
- A resource being replaced or deprecated.

You do not need to version every small documentation edit. If the change is just wording, formatting, or a small clarification, updating the current page is usually enough.
