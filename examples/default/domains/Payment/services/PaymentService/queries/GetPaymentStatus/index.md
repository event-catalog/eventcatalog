---
id: GetPaymentStatus
name: Get payment status
version: 0.0.1
summary: |
  GET request that will return the payment status for a specific order, identified by its orderId.
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

The `GetPaymentStatus` message is a query used to retrieve the payment status for a specific order, identified by its `orderId`. This query returns the current status of the payment, such as whether it is pending, completed, failed, or refunded. It is used by systems that need to track the lifecycle of payments associated with orders, ensuring that the payment has been successfully processed or identifying if any issues occurred during the transaction.

This query is useful in scenarios such as order management, refund processing, or payment auditing, ensuring that users or systems have real-time visibility into the payment status for a given order.

<NodeGraph />

<SchemaViewer file="schema.json" title="JSON Schema" maxHeight="500" />