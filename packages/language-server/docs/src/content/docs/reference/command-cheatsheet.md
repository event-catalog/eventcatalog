---
title: Command Cheatsheet
description: Quick copy/paste commands for .ec import and export workflows.
---

## Import

```bash
# Import one file
npx @eventcatalog/cli --dir ./catalog import ./catalog.ec

# Import multiple files
npx @eventcatalog/cli --dir ./catalog import ./core.ec ./payments.ec

# Dry run
npx @eventcatalog/cli --dir ./catalog import ./catalog.ec --dry-run

# Flat write mode
npx @eventcatalog/cli --dir ./catalog import ./catalog.ec --flat

# Read from stdin
cat ./catalog.ec | npx @eventcatalog/cli --dir ./catalog import --stdin
```

## Export

```bash
# Export all resources
npx @eventcatalog/cli --dir ./catalog export --all --stdout

# Export all services
npx @eventcatalog/cli --dir ./catalog export --resource service --stdout

# Export one event
npx @eventcatalog/cli --dir ./catalog export --resource event --id OrderCreated --stdout

# Hydrated export
npx @eventcatalog/cli --dir ./catalog export --resource service --id OrdersService --hydrate --stdout
```

## Build docs site

```bash
pnpm --filter @eventcatalog/cli docs:dev
pnpm --filter @eventcatalog/cli docs:build
pnpm --filter @eventcatalog/cli docs:preview
```
