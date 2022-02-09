---
name: OrderConfirmed
version: 0.0.1
summary: |
  Event represents when an order has been confirmed and ready to be processed (shipped for example)
producers:
    - Orders Service
consumers:
    - Shipping Service
owners:
    - dboyne
    - mSmith
---

<Admonition>When firing this event make sure you set the `correlation-id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition>

### Details

This event is triggered when the customers order has been verified and the stock has been checked. Once this event is triggered we are safe to say it is ready for shipment.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />