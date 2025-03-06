---
id: CreateReturnLabel
name: Create return label
version: 0.0.1
summary: |
  POST request that will create a return label for a specific shipment, identified by its shipmentId.
owners:
    - dboyne
schemaPath: schema.json
---

import Footer from '@catalog/components/footer.astro';

## Overview

The `CreateReturnLabel` message is a command used to create a return label for a specific shipment, identified by its `shipmentId`. It provides information such as the shipment status (e.g., pending, completed, shipped), the items within the shipment, billing and shipping details, payment information, and the order's total amount. This query is commonly used by systems managing order processing, customer service, or order tracking functionalities.

This command can be applied in e-commerce systems, marketplaces, or any platform where users and systems need real-time shipment data for tracking, auditing, or managing customer purchases.

<NodeGraph />

<SchemaViewer file="schema.json" title="JSON Schema" maxHeight="500" />