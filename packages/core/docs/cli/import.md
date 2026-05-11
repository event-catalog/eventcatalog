---
id: cli-import
title: Import
sidebar_label: Import
sidebar_position: 18
---

# Import CLI Commands

Manage import in your EventCatalog from the command line.

## import

Import EventCatalog DSL (.ec) files into catalog markdown files. Existing resources with the same version are overridden. Importing a newer version automatically moves the old version into the versioned/ folder.

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| files | string | No | One or more .ec file paths to import |
| stdin | boolean | No | Read DSL from stdin |
| dry-run | boolean | No | Preview resources without writing |
| no-init | boolean | No | Skip catalog initialization prompt |



---
