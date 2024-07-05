---
id: PaymentProcessed
name: Payment Processed
version: 0.0.1
summary: Event is triggered after the payment has been successfully processed
owners:
    - dboyne
---

## Overview

The PaymentProcessed event is triggered after the payment has been successfully processed by the Payment Service. This event signifies that a payment has been confirmed, and it communicates the outcome to other services and components within the system.

<NodeGraph />

### Payload Example

```json title="Payload example"
{
  "transactionId": "123e4567-e89b-12d3-a456-426614174000",
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "orderId": "789e1234-b56c-78d9-e012-3456789fghij",
  "amount": 100.50,
  "paymentMethod": "CreditCard",
  "status": "confirmed",
  "confirmationDetails": {
    "gatewayResponse": "Approved",
    "transactionId": "abc123"
  },
  "timestamp": "2024-07-04T14:48:00Z"
}
```

### Security Considerations

- **Data Validation**: Ensure that all data in the event payload is validated before publishing to prevent injection attacks or other malicious activities.
- **Sensitive Data Handling**: Avoid including sensitive information (e.g., full credit card numbers) in the event payload. Use secure channels and encryption for such data.
- **Authentication and Authorization**: Ensure that only authorized services can publish or consume PaymentProcessed events.