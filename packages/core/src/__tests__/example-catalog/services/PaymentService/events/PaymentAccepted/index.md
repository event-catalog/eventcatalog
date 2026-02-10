---
id: PaymentAccepted
name: Payment Accepted
version: 0.0.2
summary: Event is triggered when a user accepts a payment through the Payment Service
owners:
    - dboyne
---

## Overview

The Payment Accepted event is triggered when a user accepts a payment through the Payment Service.

<NodeGraph />

### Payload Example

```json 
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "orderId": "789e1234-b56c-78d9-e012-3456789fghij",
  "amount": 100.50,
  "paymentMethod": "CreditCard",
  "timestamp": "2024-07-04T14:48:00Z"
}
```