---
name: AddedItemToCart
version: 0.0.3
summary: |
  Holds information about the cusomer and product when they add an item to the cart.
producers:
    - Shopping API
    - Application API
consumers:
    - Customer Portal
domains:
    - Shopping
owners:
    - dboyne
    - mSmith
draft: true    
---

<Admonition>When firing this event make sure you set the `correlation-id` in the headers.</Admonition>

<Mermaid />

### Details

This event can be triggered multiple times per customer. Everytime the customer interacts with their shopping cart and removes an item this event will be triggered.

<Schema />