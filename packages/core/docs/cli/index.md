---
id: cli-overview
title: CLI Reference
sidebar_label: Overview
sidebar_position: 1
---

# EventCatalog CLI

The EventCatalog CLI allows you to interact with your EventCatalog directly from the command line. Execute any SDK function without writing code.

## Installation

You can run the CLI directly using `npx` without installing:

```bash
npx @eventcatalog/cli <function> [args...]
```

Or install globally:

```bash
npm install -g @eventcatalog/cli
```

Then use the `eventcatalog` command:

```bash
eventcatalog <function> [args...]
```

## Basic Usage

### Specifying the catalog directory

By default, the CLI uses the current directory. Use `--dir` to specify a different path:

```bash
npx @eventcatalog/cli --dir /path/to/catalog getEvents
```

### Listing available functions

```bash
npx @eventcatalog/cli list
```

### Getting help

```bash
npx @eventcatalog/cli --help
```

## Output Format

All commands output JSON, making it easy to pipe to other tools like `jq`:

```bash
# Get all events and extract IDs
npx @eventcatalog/cli getEvents | jq '.[].id'

# Count total events
npx @eventcatalog/cli getEvents | jq 'length'

# Filter events by version
npx @eventcatalog/cli getEvents | jq '.[] | select(.version == "1.0.0")'
```

## Argument Types

Arguments are automatically parsed:

| Type | Format | Example |
|------|--------|---------|
| String | Plain text or quoted | `"OrderCreated"` |
| Number | Numeric value | `42` or `3.14` |
| Boolean | `true` or `false` | `true` |
| JSON Object | `'{...}'` | `'{"id":"test","version":"1.0.0"}'` |
| JSON Array | `'[...]'` | `'["item1","item2"]'` |

## Quick Examples

### Read operations

```bash
# Get a specific event
npx @eventcatalog/cli getEvent "OrderCreated"

# Get all services (latest versions only)
npx @eventcatalog/cli getServices '{"latestOnly":true}'

# Check if a version exists
npx @eventcatalog/cli eventHasVersion "OrderCreated" "1.0.0"
```

### Write operations

```bash
# Create a new event
npx @eventcatalog/cli writeEvent '{"id":"OrderCreated","name":"Order Created","version":"1.0.0","markdown":"# Order Created Event"}'

# Add a service to a domain
npx @eventcatalog/cli addServiceToDomain "Orders" '{"id":"OrderService","version":"1.0.0"}'
```

### Delete operations

```bash
# Remove an event by ID
npx @eventcatalog/cli rmEventById "OrderCreated"

# Remove a specific version
npx @eventcatalog/cli rmEventById "OrderCreated" "1.0.0"
```

### Version operations

```bash
# Version an event (move current to versioned directory)
npx @eventcatalog/cli versionEvent "OrderCreated"
```
