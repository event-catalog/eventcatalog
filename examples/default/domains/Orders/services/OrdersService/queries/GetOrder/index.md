---
id: GetOrder
name: Get order details
version: 0.0.1
summary: |
  GET request that will return detailed information about a specific order, identified by its orderId.
owners:
    - dboyne
badges:
    - content: Recently updated!
      backgroundColor: green
      textColor: green
schemaPath: schema.json
---

import Footer from '@catalog/components/footer.astro';

## Overview

The `GetOrder` message is a query used to retrieve detailed information about a specific order, identified by its `orderId`. It provides information such as the order status (e.g., pending, completed, shipped), the items within the order, billing and shipping details, payment information, and the order's total amount. This query is commonly used by systems managing order processing, customer service, or order tracking functionalities.

This query can be applied in e-commerce systems, marketplaces, or any platform where users and systems need real-time order data for tracking, auditing, or managing customer purchases.

<NodeGraph />

<SchemaViewer file="schema.json" title="JSON Schema" maxHeight="500" />