---
sidebar_position: 1
keywords:
- EventCatalog services
- Services
sidebar_label: What are flows?
title: Understanding flows
description: What are flows? Why are they useful for event-driven architectures?
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.5.0" />

Flows are a way to document business workflows in your organization. You can reuse your documented resources (e.g services, messages, data stores) in your flows.

An example of a flow would be when a user makes a payment to an e-commence system, this interaction triggers many parts of the architecture (services, external services, commands, queries and events):

1. User requests to make payment (e.g MakePayment Command)
1. Command is sent to Payment Service (e.g Payment Service)
1. Payment service will either accept or reject payment (e.g PaymentAccepted / PaymentRejected events)
1. Notification service listens to these events and sends Emails (e.g EmailSent Event)
1. User will be notified of payment success/failure

### Example

![Example](../img/flows/flow-example.png)

[You can see a payment flow example here](https://demo.eventcatalog.dev/visualiser/flows/PaymentFlow/1.0.0).


<!-- 
### Further reading
- [Event-driven architecture and domain-driven design](https://eda-visuals.boyney.io/visuals/eda-and-ddd)
- [Domain, Subdomain, Bounded Context: Problem/Solution Space in DDD: Clearly Defined](https://medium.com/nick-tune-tech-strategy-blog/domains-subdomain-problem-solution-space-in-ddd-clearly-defined-e0b49c7b586c)
- [Building Blocks of DDD](https://redis.io/glossary/domain-driven-design-ddd/) -->