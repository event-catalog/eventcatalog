---
sidebar_position: 4
sidebar_label: MVP status and feedback
title: Federation MVP status and feedback
description: Understand the current Federation release boundaries and how to share useful feedback.
---

import EventCatalogEnterprise from '@site/src/components/MDX/EventCatalogEnterprise';

<EventCatalogEnterprise />

EventCatalog Federation is being introduced as an initial working release for feedback.

The core workflow is ready to combine real catalogs, validate ownership, and build an organization-wide view. The first release deliberately keeps source configuration and execution explicit while EventCatalog learns how teams want to operate Federation.

## What is included

The MVP includes:

- GitHub sources
- Local filesystem sources for development
- Indexing and hydration of EventCatalog resources
- Cross-catalog relationship and version resolution
- Central catalog ownership validation
- Schemas, specifications, sidecar files, public assets, and custom components
- Configurable `off`, `warn`, and `error` diagnostic rules
- Content hashing and a verified local cache
- Stale generated-output cleanup
- Restoration of previous output after a normal failed update
- A lockfile that records completed source and managed public-file state

## Current boundaries

The first release does not include:

- `add`, `status`, or `dry-run` source management commands
- Automatic Federation before `dev`, `build`, or `generate`
- Local source watcher integration
- A frozen mode that installs the commits recorded in `eventcatalog.lock`
- Graph diff commands
- Automatic cache pruning
- Parallel source fetching
- A command for publishing `catalog.index.json`
- Federation of top-level reusable `snippets/`

Sources are configured manually in `eventcatalog.config.js` and processed with:

```bash
npx eventcatalog federate
```

These constraints are intentional for the feedback release. They keep the contract small while the team observes which operational workflows matter in real organizations.

## Useful areas for feedback

When you try Federation, consider:

- Is editing `federation.sources` directly clear enough?
- Do you prefer moving branches or immutable commits?
- Which diagnostics should block your organization catalog?
- Does local filesystem Federation give you a useful development loop?
- How often do resource, asset, or component collisions occur?
- Should Federation run manually, in CI, or automatically before builds?
- Do your teams share custom components, reusable snippets, or npm dependencies?
- How large are your catalogs and how long does a Federation run take?
- What information would you expect from future `status` or diff commands?

## Share feedback

The most useful feedback includes:

- What you were trying to federate
- The number and approximate size of the source catalogs
- Whether the sources were GitHub or local
- What worked
- What was confusing
- The diagnostic or workflow that blocked you
- What you expected Federation to do

Share feedback in the [EventCatalog Discord](https://eventcatalog.dev/discord) or [open an issue in the EventCatalog repository](https://github.com/event-catalog/eventcatalog/issues).

## Related guides

- [EventCatalog Federation overview](/docs/federation/overview)
- [How Federation works](/docs/federation/explanation/how-it-works)
- [Troubleshooting Federation](/docs/federation/reference/troubleshooting)
