---
id: "CancelSubscription"
name: "User Cancels Subscription"
version: "1.0.0"
summary: "Flow for when a user has cancelled a subscription"
steps:
  - id: "cancel_subscription_initiated"
    title: "Cancels Subscription"
    summary: "User cancels their subscription"
    actor:
      name: "User"
    next_step: 
      id: "cancel_subscription_request"
      label: "Initiate subscription cancellation"

  - id: "cancel_subscription_request"
    title: "Cancel Subscription"
    message:
      id: "CancelSubscription"
      version: "0.0.1"
    next_step: 
      id: "subscription_service"
      label: "Proceed to subscription service"

  - id: "stripe_integration"
    title: "Stripe"
    externalSystem:
      name: "Stripe"
      summary: "3rd party payment system"
      url: "https://stripe.com/"
    next_step: 
      id: "subscription_service"
      label: "Return to subscription service"

  - id: "subscription_service"
    title: "Subscription Service"
    service:
      id: "SubscriptionService"
      version: "0.0.1"
    next_steps:
      - id: "stripe_integration"
        label: "Cancel subscription via Stripe"
      - id: "subscription_cancelled"
        label: "Successful cancellation"
      - id: "subscription_rejected"
        label: "Failed cancellation"

  - id: "subscription_cancelled"
    title: "Subscription has been Cancelled"
    message:
      id: "UserSubscriptionCancelled"
      version: "0.0.1"
    next_step:
      id: "notification_service"
      label: "Email customer"

  - id: "subscription_rejected"
    title: "Subscription cancellation has been rejected"

  - id: "notification_service"
    title: "Notifications Service"
    service:
      id: "NotificationService"
      version: "0.0.2"

---

<NodeGraph />
