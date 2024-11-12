---
id: ProcessingOfAnOrder
name: Processing of an order
version: 1.0.0
steps:
    - id: "customer_place_order"
      title: Customer places order
      next_step: "place_order_request"
    - id: "place_order_request"
      title: Place order
      message:
        id: PlaceOrder
        version: 0.0.1
      next_step:
        id: "payment_initiated"
        label: Initiate payment
---

### Flow of feature
<NodeGraph/>