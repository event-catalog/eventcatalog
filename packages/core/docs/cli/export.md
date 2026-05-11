---
id: cli-export
title: Export
sidebar_label: Export
sidebar_position: 17
---

# Export CLI Commands

Manage export in your EventCatalog from the command line.

## export

Export catalog resources to EventCatalog DSL (.ec) format

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| all | boolean | No | Export the entire catalog (all resource types) |
| id | string | No | Resource ID (omit to export all of the given type) |
| version | string | No | Resource version (defaults to latest) |
| stdout | boolean | No | Print to stdout instead of writing a file |
| output | string | No | Output file path (defaults to &lt;id&gt;.ec or catalog.ec) |



---
