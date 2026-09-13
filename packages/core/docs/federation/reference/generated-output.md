---
sidebar_position: 5
sidebar_label: Generated output
title: Federation generated output reference
description: Reference for federated resources, shared components, public assets, the lockfile, and content cache.
---

import EventCatalogEnterprise from '@site/src/components/MDX/EventCatalogEnterprise';

<EventCatalogEnterprise />

A successful Federation run can create or update four locations in the central catalog:

```text
central-catalog/
├── federated/
├── public/
├── .eventcatalog-cache/
└── eventcatalog.lock
```

## `federated/`

Federated resource files are grouped by stable source identity:

```text
federated/
├── acme-payments--0cfe83f789ab/
│   ├── domains/
│   ├── services/
│   ├── events/
│   ├── teams/
│   └── users/
├── acme-orders--7575b99c8b32/
│   ├── domains/
│   ├── services/
│   └── events/
└── components/
```

The directory name contains:

- A filesystem-safe form of the source `id`
- A short hash of the complete source `id`

The hash prevents different IDs that produce the same safe text from sharing a directory.

Resource-relative files remain with their resource, including:

- Schemas
- OpenAPI, AsyncAPI, and GraphQL specifications
- Sidecar documentation and files
- Diagrams and other resource-local content

Do not edit `federated/`. It is replaced by the next successful run.

## `federated/components/`

Top-level custom components from remote catalogs are materialized into the shared `federated/components/` directory.

When EventCatalog prepares the application, federated components form the base layer and the central catalog's local `components/` directory is applied afterward. A local component at the same relative path overrides the federated component.

Top-level reusable `snippets/` are not federated in the current release.

## `public/`

Remote `public/` assets are first hydrated, then composed into the central catalog's `public/` directory.

Selection rules:

1. When several remote sources publish different content at one path, the last configured source wins and `federation/asset-collision` is reported.
2. When the central catalog already owns the path, the central file is preserved.
3. When a previously managed remote file was changed manually, Federation preserves it instead of treating it as managed output.
4. When a managed remote file disappears from all sources, a later successful run removes it.

Managed public-file hashes and source IDs are stored in `eventcatalog.lock`.

## `eventcatalog.lock`

The lockfile records:

- `lockVersion`
- Source IDs
- Source commits or local content revisions
- Source index digests
- Resolution times
- Managed public files

It is written after a successful output update. It records what the run used but does not control the next run.

See [Federation lockfile and content cache](/docs/federation/explanation/lockfile-and-cache).

## `.eventcatalog-cache/`

Federation content is cached under:

```text
.eventcatalog-cache/federation/content/
```

Entries use SHA-256 content keys and are verified before reuse. The cache is disposable and should normally be ignored by Git.

The current release does not automatically remove content that is no longer referenced, so the cache can grow over time.

## Cleanup when sources change

On a successful run:

- Resources no longer present in an index disappear from `federated/`
- Removed sources disappear from `federated/`
- Stale managed public files are removed
- New source content replaces the previous generated content

When `federation.sources` becomes empty, the command removes previous Federation output, managed public files, and the lockfile.

## Failed output updates

Federation stages new output and snapshots affected public files. If a normal output update fails, it attempts to restore the previous generated resources and public assets. The previous lockfile remains associated with the previous successful view.
