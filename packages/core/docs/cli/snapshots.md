---
id: cli-snapshots
title: Snapshots
sidebar_label: Snapshots
sidebar_position: 19
---

# Snapshots CLI Commands

Manage snapshots in your EventCatalog from the command line.

## createSnapshot

Take a point-in-time snapshot of the entire catalog, capturing all resources and their metadata as a JSON file

**Arguments:** None



---

## diffSnapshots

Compare two snapshot files and output a structured diff showing added, removed, modified, and versioned resources plus relationship changes

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| fileA | string | Yes | Path to the first (older) snapshot file |
| fileB | string | Yes | Path to the second (newer) snapshot file |



---

## listSnapshots

List all snapshots in the catalog .snapshots directory with their labels, timestamps, and git info

**Arguments:** None



---
