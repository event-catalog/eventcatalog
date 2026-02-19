---
title: Export EventCatalog to models
description: Convert EventCatalog resources into .ec modeling files.
---

Exporting means taking existing EventCatalog resources and converting them into `.ec` files you can model with. Use this when you want to move current documentation into the modeling layer for planning, prototyping, or editing in Git. You can export a full catalog, a single resource type, or one resource.

```mermaid
flowchart LR
  A[EventCatalog Documentation] -->|export| B[.ec modeling files]
```

## Export everything

```bash
npx @eventcatalog/cli --dir ./catalog export --all --stdout
```

## Export one resource type

```bash
npx @eventcatalog/cli --dir ./catalog export --resource service --stdout
```

## Export one resource

```bash
npx @eventcatalog/cli --dir ./catalog export --resource event --id OrderCreated --version 1.0.0 --stdout
```

## Optional flags

- `--hydrate`: Include referenced resources in output.
- `--output <path>`: Write to a specific file.
- `--playground`: Open exported DSL in EventCatalog Modelling.

## Current export scope

Export currently supports:

- `event`, `command`, `query`, `service`, `domain`

Some imported types (for example diagrams and channels) are not yet supported for DSL export.
