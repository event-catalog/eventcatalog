---
id: PaymentFlow
name: Payment Flow for E-commerce
version: 1.0.0
summary: Business flow for processing payments in an e-commerce platform
steps:
    - id: 1
      title: Order Placed
      message:
        id: OrderCreated
        version: 0.0.1
      paths:
        - step: 2
          label: Proceed to payment
    - id: 2
      title: Payment Initiated
      message:
        id: PaymentInitiated
        version: 0.0.1
      paths:
        - step: 3
          label: Payment successful
        - step: 4
          label: Payment failed
    - id: 3
      title: Payment Processed
      message:
        id: PaymentProcessed
        version: 0.0.1
      paths:
        - step: 5
          label: Adjust inventory
        - step: 6
          label: Notify customer
    - id: 4
      title: Payment Failed
      type: node
      paths:
        - step: 7
          label: Notify customer of failure
        - step: 8
          label: Retry payment
    - id: 5
      title: Inventory Adjusted
      message:
        id: InventoryAdjusted
        version: 0.0.3
      paths:
        - step: 9
          label: Complete order
    - id: 6
      title: Customer Notified of Payment
      type: node
      paths:
        - step: 9
          label: Complete order
    - id: 7
      title: Customer Notified of Failure
      type: node
    - id: 8
      title: Retry Payment
      type: node
      paths:
        - step: 2
          label: Retry payment process
    - id: 9
      title: Payment Complete
      message:
        id: PaymentComplete
        version: 0.0.2
      paths:
        - step: 10
          label: Order completed
    - id: 10
      title: Order Completed
      type: node
---