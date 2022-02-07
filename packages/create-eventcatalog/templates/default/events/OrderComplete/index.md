---
name: OrderComplete
version: 0.0.1
summary: |
  Event represents when an order has been complete. (Delivered and finished)
producers:
    - Orders Service
consumers:
    - Data Lake
owners:
    - dboyne
    - mSmith
---

<Admonition>When firing this event make sure you set the `correlation-id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition>

### Details

This event is the final event of the ordering process. It gets raised when the shipment has been delivered.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />