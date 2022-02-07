---
name: OrderRequested
version: 0.0.1
summary: |
  Holds information about the customers order.
producers:
    - Basket Service
consumers:
    - Payment Service
owners:
    - dboyne
    - mSmith
---

<Admonition>When firing this event make sure you set the `correlation-id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition>

### Details

This event is triggered when the user confirms their order and wants to process their payment.

We have a frontend application that allows users to buy things from our store. The frontend application interacts with the Backet Service to trigger the `OrderRequested` event.

<NodeGraph title="Consumer / Producer Diagram" />

<Schema />