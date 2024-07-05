---
id: UpdateInventory
name: Update inventory
version: 0.0.3
summary: |
  Command that will update a given inventory item
owners:
    - dboyne
    - msmith
    - asmith
    - full-stack
    - mobile-devs
badges:
    - content: Recently updated!
      backgroundColor: green
      textColor: green
schemaPath: "schema.json"
---

## Overview

The UpdateInventory command is issued to update the existing stock levels of a product in the inventory. This command is used by the inventory management system to adjust the quantity of products available in the warehouse or store, either by increasing or decreasing the current stock levels.

## Architecture diagram

<NodeGraph />

## Payload example

```json title="Payload example"
{
  "productId": "789e1234-b56c-78d9-e012-3456789fghij",
  "quantityChange": -10,
  "warehouseId": "456e7891-c23d-45f6-b78a-123456789abc",
  "timestamp": "2024-07-04T14:48:00Z"
}
```

## Schema (JSON schema)

<Schema file="schema.json"/>

