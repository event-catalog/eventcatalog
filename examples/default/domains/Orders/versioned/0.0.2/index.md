---
id: Orders
name: Orders
version: 0.0.2
owners:
  - dboyne
services:
  - id: InventoryService
    version: 0.0.2
  - id: NotificationService
    version: 0.0.2
  - id: OrdersService
    version: 0.0.2
badges:
  - content: New domain
    backgroundColor: blue
    textColor: blue
---

## Overview

The Orders domain handles all operations related to customer orders, from creation to fulfillment. This documentation provides an overview of the events and services involved in the Orders domain, helping developers and stakeholders understand the event-driven architecture.

<Admonition type="warning">Please ensure all services are updated to the latest version for compatibility and performance improvements.</Admonition>

## Bounded context

<NodeGraph />

### Order example (sequence diagram)

```mermaid
sequenceDiagram
    participant Customer
    participant OrdersService
    participant InventoryService
    participant NotificationService

    Customer->>OrdersService: Place Order
    OrdersService->>InventoryService: Check Inventory
    InventoryService-->>OrdersService: Inventory Available
    OrdersService->>InventoryService: Reserve Inventory
    OrdersService->>NotificationService: Send Order Confirmation
    NotificationService-->>Customer: Order Confirmation
    OrdersService->>Customer: Order Placed Successfully
    OrdersService->>InventoryService: Update Inventory
```

 