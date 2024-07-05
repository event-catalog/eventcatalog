---
id: OrdersService
version: 0.0.2
name: Orders Service
summary: |
  Service that handles orders
owners:
    - dboyne
receives:
  - id: InventoryAdjusted
    version: 0.0.3
sends:
  - id: AddInventory  
    version: 0.0.3
repository:
  language: JavaScript
  url: https://github.com/boyney123/pretend-shipping-service
schemaPath: "openapi.yml"
---

## Overview

The Orders Service is responsible for managing customer orders within the system. It handles order creation, updating, status tracking, and interactions with other services such as Inventory, Payment, and Notification services to ensure smooth order processing and fulfillment.

<OpenAPI />

## Architecture diagram 

<NodeGraph />