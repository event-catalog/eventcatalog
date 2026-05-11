---
id: cli-utilities
title: Utilities
sidebar_label: Utilities
sidebar_position: 16
---

# Utilities CLI Commands

Manage utilities in your EventCatalog from the command line.

## dumpCatalog

Dumps the entire catalog to a JSON structure

**Arguments:** None

**Examples:**

```bash
# Dump entire catalog
npx @eventcatalog/cli dumpCatalog

# Dump and save to file
npx @eventcatalog/cli dumpCatalog > catalog.json
```

---

## getEventCatalogConfigurationFile

Returns the EventCatalog configuration file

**Arguments:** None

**Examples:**

```bash
# Get config file
npx @eventcatalog/cli getEventCatalogConfigurationFile
```

---
