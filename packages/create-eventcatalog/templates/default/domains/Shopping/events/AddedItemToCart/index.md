---
name: AddedItemToCart
version: 0.0.2
summary: |
  Holds information about what the user added to their shopping cart.
producers:
    - Basket Service
consumers:
    - Data Lake
owners:
    - dboyne
    - mSmith
---

<Admonition>When firing this event make sure you set the `correlation-id` in the headers. Our schemas have standard metadata make sure you read and follow it.</Admonition>

### Details

This event can be triggered multiple times per customer. Everytime the customer adds an item to their shopping cart this event will be triggered.

We have a frontend application that allows users to buy things from our store. This front end interacts directly with the `Basket Service` to add items to the cart. The `Basket Service` will raise the events.

<NodeGraph title="Consumer / Producer Diagram" />

<EventExamples title="How to trigger event" />

<Schema />

<SchemaViewer renderRootTreeLines defaultExpandedDepth='0' maxHeight="500" />