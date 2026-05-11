---
sidebar_position: 4
sidebar_label: Version documents
title: Version documents
description: Keep historical versions of resource docs alongside versioned resources.
keywords:
  - EventCatalog resource docs versioning
  - versioned documentation
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.15.0" />

## How versioning works

Resource docs are associated with a specific version of a resource. When you version a resource, the docs in that resource's `docs/` directory apply to the current (latest) version.

Previous versions of a doc are stored inside the resource's `versioned/` directory, following the same pattern used for versioned resources.

```
services/
└── OrdersService/
    ├── index.mdx
    ├── docs/
    │   └── runbooks/
    │       └── 01-deployment.md        ← current version
    └── versioned/
        └── 0.0.2/
            └── docs/
                └── runbooks/
                    └── 01-deployment.md   ← older version
```

## Navigate between versions

When a doc has multiple versions, a **Versions** panel is shown in the right-hand column of the doc page. You can use it to jump to any historical version of that document.

A banner is shown at the top of older versions to make clear that a newer version exists.

## Doc version vs resource version

A doc file's `version` frontmatter field refers to the **doc's own version**, not the resource version. This allows a doc to be updated independently of the resource it belongs to.

If `version` is omitted from frontmatter, EventCatalog infers it from the resource version the doc file lives under.
