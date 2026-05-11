---
sidebar_position: 1
keywords:
- EventCatalog services
- Services
sidebar_label: What are services?
title: Understanding services
description: What are services? Why are they useful for event-driven architectures?
---

import AddedIn from '@site/src/components/MDX/AddedIn';

In EventCatalog services represent systems that produce or receive messages (e.g [commands](/docs/development/guides/messages/commands/introduction), [events](/docs/development/guides/messages/events/introduction) or [queries](/docs/development/guides/messages/queries/introduction)).

Services can have one or more specifications (OpenAPI, AsyncAPI, GraphQL) attached to them.

Services can be part of a domain, subdomain or independent.

:::tip

If your building microservices, think of a service as a microservice, or if you are building monolith applications, think of a service as that application. The term service is loosely defined by EventCatalog as flexible to what you need.

:::

## Internal and external services

Services in EventCatalog fall into two categories:

- **Internal services** — systems your team owns and operates. Your own microservices, monoliths, or applications. This is the default when you create a service.
- **External services** — third-party systems you integrate with but do not own, such as Stripe, Twilio, or Snowflake. You opt in to this by setting `externalSystem: true` on the service.

Both are just services under the hood — they share the same schema, can send and receive messages, be versioned, have owners, and carry specifications. The distinction only affects how they are grouped in the sidebar and rendered in the visualiser, so that the systems you operate are easy to tell apart from the ones you depend on.

