---
id: CreateShipment
name: Create shipment
version: 0.0.1
summary: |
  POST request that will create a shipment for a specific order, identified by its orderId.
owners:
    - dboyne
schemaPath: schema.json
---

import Footer from '@catalog/components/footer.astro';

## Overview

The `CreateShipment` message is a command used to create a shipment for a specific order, identified by its `orderId`. It provides information such as the order status (e.g., pending, completed, shipped), the items within the order, billing and shipping details, payment information, and the order's total amount. This query is commonly used by systems managing order processing, customer service, or order tracking functionalities.

This command can be applied in e-commerce systems, marketplaces, or any platform where users and systems need real-time order data for tracking, auditing, or managing customer purchases.

<NodeGraph />

<SchemaViewer file="schema.json" title="JSON Schema" maxHeight="500" />