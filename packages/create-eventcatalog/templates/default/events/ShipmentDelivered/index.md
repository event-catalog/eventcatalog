---
name: ShipmentDelivered
version: 0.0.1
summary: |
  Event represents when a shipment has been delievered and received.
producers:
    - Shipping Service
consumers:
    - Order Service
    - Data Lake
owners:
    - dboyne
    - mSmith
---

<Admonition>When firing this event make sure you set the `correlation-id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition>

### Details

This event is triggered when a shipment has been delievered to it's destination.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />