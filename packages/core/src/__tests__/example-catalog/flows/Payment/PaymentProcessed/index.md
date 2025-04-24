---
id: PaymentFlow
name: Payment Flow for customers
version: 1.0.0
summary: Business flow for processing payments in an e-commerce platform
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
    - id: "payment_initiated"
      title: Payment Initiated
      message:
        id: PaymentInitiated
        version: 0.0.1
      next_steps:
        - "payment_processed"
        - "payment_failed"
    - id: "payment_processed"
      title: Payment Processed
      message:
        id: PaymentProcessed
        version: 0.0.1
      next_steps:
        - id: "adjust_inventory"
          label: Adjust inventory
        - id: "send_custom_notification"
          label: Notify customer
    - id: "payment_failed"
      title: Payment Failed
      type: node
      next_steps:
        - id: "failure_notification"
          label: Notify customer of failure
        - id: "retry_payment"
          label: Retry payment
    - id: "adjust_inventory"
      title: Inventory Adjusted
      message:
        id: InventoryAdjusted
        version: 1.0.1
      next_step:
        id: "payment_complete"
        label: Complete order
    - id: "send_custom_notification"
      title: Customer Notified of Payment
      type: node
      next_step:
        id: "payment_complete"
        label: Complete order
    - id: "failure_notification"
      title: Customer Notified of Failure
      type: node
    - id: "retry_payment"
      title: Retry Payment
      type: node
      next_step:
        id: "payment_initiated"
        label: Retry payment process
    - id: "payment_complete"
      title: Payment Complete
      message:
        id: PaymentComplete
        version: 0.0.2
      next_step:
        id: "order-complete"
        label: Order completed
    - id: "order-complete"
      title: Order Completed
      type: node
---

### Flow of feature
<NodeGraph/>