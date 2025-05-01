---
id: OrderAmended
name: Order amended
version: 0.0.1
summary: |
  Indicates an order has been changed
owners:
    - dboyne
    - msmith
badges:
    - content: Recently updated!
      backgroundColor: green
      textColor: green
    - content: Broker:Apache Kafka
      backgroundColor: yellow
      textColor: yellow
      icon: kafka
schemaPath: schema.avro
---

import Footer from '@catalog/components/footer.astro';

## Overview

The OrderAmended event is triggered whenever an existing order is modified. This event ensures that all relevant services are notified of changes to an order, such as updates to order items, quantities, shipping information, or status. The event allows the system to maintain consistency and ensure that all dependent services can react appropriately to the amendments.

## Example payload

```json title="Example Payload"
{
  "orderId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "amendedItems": [
    {
      "productId": "789e1234-b56c-78d9-e012-3456789fghij",
      "productName": "Example Product",
      "oldQuantity": 2,
      "newQuantity": 3,
      "unitPrice": 29.99,
      "totalPrice": 89.97
    }
  ],
  "orderStatus": "confirmed",
  "totalAmount": 150.75,
  "timestamp": "2024-07-04T14:48:00Z"
}
```

## Schema (Avro)

<Schema file="schema.avro" />

## Schema (JSON)

<Schema file="schema.json" />

<Footer />