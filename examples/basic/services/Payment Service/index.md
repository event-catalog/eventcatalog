---
name: Payment Service
summary: |
  Event based application that integrates with Stripe.
owners:
  - dboyne
badges:
  - content: New!
    backgroundColor: blue
    textColor: blue
  - content: Payment Process
    backgroundColor: yellow
    textColor: red
---

The payment service is our own internal payment service that listens to events from stripe and handles them within our own domain. 

We use Stripe to handle services and use this Payment service to enrich events for internal use.
[Contributing](./contributing.md)

<OpenAPI />

<NodeGraph />
