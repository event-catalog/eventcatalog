---
name: ShipmentDispatched
version: 0.0.1
summary: |
  Event represents when a shipment has been dispatched.
producers:
    - Shipping Service
consumers:
    - Shipping Service
owners:
    - dboyne
    - mSmith
---

<Admonition>When firing this event make sure you set the `correlation-id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition>

### Details

This event is triggered when a shipment has been dispatched from the warehouse.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />