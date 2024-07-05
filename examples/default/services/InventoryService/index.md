---
id: InventoryService
version: 0.0.2
name: Inventory Service
summary: |
  Service that handles the inventory
owners:
    - dboyne
    - full-stack
    - mobile-devs
receives:
  - id: OrderConfirmed
    version: 0.0.1
  - id: OrderCancelled
    version: 0.0.1
  - id: OrderAmended
    version: 0.0.1
  - id: UpdateInventory
    version: 0.0.3
sends:
  - id: InventoryAdjusted
    version: 0.0.4
  - id: OutOfStock
    version: 0.0.3
repository:
  language: JavaScript
  url: https://github.com/boyney123/pretend-shipping-service
---

## Overview

The Inventory Service is a critical component of the system responsible for managing product stock levels, tracking inventory movements, and ensuring product availability. It interacts with other services to maintain accurate inventory records and supports operations such as order fulfillment, restocking, and inventory audits.

## Architecture diagram

<NodeGraph title="Hello world" />