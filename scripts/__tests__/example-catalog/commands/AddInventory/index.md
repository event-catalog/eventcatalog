---
id: AddInventory
name: Add inventory
version: 0.0.3
summary: |
  Command that will add item to a given inventory id
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
schemaPath: 'schema.json'
---

## Overview

The AddInventory command is issued to add new stock to the inventory. This command is used by the inventory management system to update the quantity of products available in the warehouse or store.

## Architecture diagram

<NodeGraph/>

## Payload example

```json title="Payload example"
{
  "productId": "789e1234-b56c-78d9-e012-3456789fghij",
  "quantity": 50,
  "warehouseId": "456e7891-c23d-45f6-b78a-123456789abc",
  "timestamp": "2024-07-04T14:48:00Z"
}

```

## Schema

<Schema file="schema.json"/>
