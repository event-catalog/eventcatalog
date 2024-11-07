---
id: OrderCancelled
name: Order cancelled
version: 0.0.1
summary: |
  Indicates an order has been canceled
owners:
    - dboyne
    - msmith
badges:
    - content: Recently updated!
      backgroundColor: green
      textColor: green
    - content: Channel:Apache Kafka
      backgroundColor: yellow
      textColor: yellow
schemaPath: 'schema.json'
---

## Overview

The OrderCancelled event is triggered whenever an existing order is cancelled. This event ensures that all relevant services are notified of the cancellation, allowing them to take appropriate actions such as updating inventory levels, refunding payments, and notifying the user. The event helps maintain consistency across the system by ensuring all dependent services are aware of the order cancellation.

## Example payload

```json title="Example payload"
{
  "orderId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "orderItems": [
    {
      "productId": "789e1234-b56c-78d9-e012-3456789fghij",
      "productName": "Example Product",
      "quantity": 2,
      "unitPrice": 29.99,
      "totalPrice": 59.98
    }
  ],
  "orderStatus": "cancelled",
  "totalAmount": 59.98,
  "cancellationReason": "Customer requested cancellation",
  "timestamp": "2024-07-04T14:48:00Z"
}

```

## Schema

JSON schema for the event.

<Schema title="JSON Schema" file="schema.json"/>