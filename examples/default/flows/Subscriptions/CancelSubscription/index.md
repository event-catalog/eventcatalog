---
id: CancelSubscription
name: User cancels subscription
version: 0.0.1
summary: Flow for when a user has cancelled a subscription
steps:
    - id: 1
      title: Cancels subscription
      summary: User cancels their subscription
      actor:
        name: User
      paths:
        - step: 2
          label: http request
    - id: 2
      title: Cancel Subscription
      message:
        id: CancelSubscription
        version: 0.0.1
      paths:
        - step: 4
    - id: 3
      title: Stripe
      externalSystem:
        name: Stripe
        summary: 3rd party payment system
        url: https://stripe.com/
      paths:
        - step: 4
    - id: 4
      title: Subscription Service
      service:
        id: SubscriptionService
        version: 0.0.1
      paths:
        - step: 3
          label: 'Cancel subscription'
        - step: 5
          label: 'successful'
        - step: 6  
          label: 'failed'
    - id: 5
      title: Subscription has been cancelled
      message:
        id: UserSubscriptionCancelled
        version: 0.0.1
      paths:
        - step: 7
          label: 'email customer'
    - id: 6
      title: Subscription has been rejected
    - id: 7
      title: Notifications Service
      service:
        id: NotificationService
        version: 0.0.2
---

<NodeGraph />