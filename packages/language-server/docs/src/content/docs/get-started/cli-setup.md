---
title: CLI Setup
description: How to run EventCatalog CLI commands for .ec workflows.
---

## Basic command pattern

```bash
npx @eventcatalog/cli --dir <catalog-path> <command> [options]
```

## .ec commands to know first

```bash
# Import one or more DSL files
npx @eventcatalog/cli --dir ./catalog import ./architecture.ec

# Dry-run import
npx @eventcatalog/cli --dir ./catalog import ./architecture.ec --dry-run

# Export full catalog to stdout
npx @eventcatalog/cli --dir ./catalog export --all --stdout
```

## Read from stdin

```bash
cat ./architecture.ec | npx @eventcatalog/cli --dir ./catalog import --stdin
```

## Flat vs nested imports

By default, import preserves nested placement under domains/services.

Use `--flat` if you want resources written at top-level folders.

## Skip initialization

Use `--no-init` in automation or CI when the catalog already exists.
