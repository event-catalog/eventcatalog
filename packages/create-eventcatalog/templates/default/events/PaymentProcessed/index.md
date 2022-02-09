---
name: PaymentProcessed
version: 0.0.1
summary: |
  Holds information about the payment that has been processed.
producers:
    - Payment Service
consumers:
    - Orders Service
owners:
    - dboyne
    - mSmith
---

<Admonition>When firing this event make sure you set the `correlation-id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition>

### Details

This event is triggered when the payment has succesfully been processed for a customers orders.

We use Stripe to handle customer payments. The Payment Service listens for Stripe webhooks and raises the PaymentProcessed event.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />