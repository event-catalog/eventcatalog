---
id: PaymentInitiated
name: Payment Initiated
version: 0.0.1
summary: Event is triggered when a user initiates a payment through the Payment Service
owners:
    - dboyne
---

## Overview

The Payment Initiated event is triggered when a user initiates a payment through the Payment Service. This event signifies the beginning of the payment process and contains all necessary information to process the payment.

<NodeGraph />

### Payload Example

```json title="Payload example"
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "orderId": "789e1234-b56c-78d9-e012-3456789fghij",
  "amount": 100.50,
  "paymentMethod": "CreditCard",
  "timestamp": "2024-07-04T14:48:00Z"
}
```

### Security Considerations

- **Authentication**: Ensure that only authenticated users can initiate a payment, and the userId in the payload matches the authenticated user.
- **Data Validation**: Validate all input data to prevent injection attacks or other malicious input.
- **Sensitive Data Handling**: Avoid including sensitive information (e.g., credit card numbers) in the event payload. Use secure channels and encryption for such data.