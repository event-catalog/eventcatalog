---
id: PaymentFlow
name: Payment Flow for customers
version: 1.0.0
summary: Business flow for processing payments in an e-commerce platform
steps:
    - id: 1
      title: Customer places order
      type: node
      paths:
        - step: 2
          label: Proceed to payment
    - id: 2
      title: Place order
      message:
        id: PlaceOrder
        version: 0.0.1
      paths:
        - step: 3
          label: Initiate payment
    - id: 3
      title: Payment Initiated
      message:
        id: PaymentInitiated
        version: 0.0.1
      paths:
        - step: 4
          label: Payment successful
        - step: 5
          label: Payment failed
    - id: 4
      title: Payment Processed
      message:
        id: PaymentProcessed
        version: 0.0.1
      paths:
        - step: 6
          label: Adjust inventory
        - step: 7
          label: Notify customer
    - id: 5
      title: Payment Failed
      type: node
      paths:
        - step: 8
          label: Notify customer of failure
        - step: 9
          label: Retry payment
    - id: 6
      title: Inventory Adjusted
      message:
        id: InventoryAdjusted
        version: 1.0.1
      paths:
        - step: 10
          label: Complete order
    - id: 7
      title: Customer Notified of Payment
      type: node
      paths:
        - step: 10
          label: Complete order
    - id: 8
      title: Customer Notified of Failure
      type: node
    - id: 9
      title: Retry Payment
      type: node
      paths:
        - step: 3
          label: Retry payment process
    - id: 10
      title: Payment Complete
      message:
        id: PaymentComplete
        version: 0.0.2
      paths:
        - step: 11
          label: Order completed
    - id: 11
      title: Order Completed
      type: node
---

### Flow of feature
<NodeGraph/>