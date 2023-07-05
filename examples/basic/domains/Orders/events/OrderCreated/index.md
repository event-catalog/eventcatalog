---
name: OrderCreated
version: 0.0.1
summary: |
  Event represents when an order has been created. 
producers:
    - Orders Service
consumers:
    - Data Lake
owners:
    - dboyne
    - mSmith
---

<NodeGraph title="Consumer/Producer Diagram" />

## OpenAPI Schema

OpenAPI schema for the event can be found below.

<OpenAPI />