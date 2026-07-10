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

A service is an implementation resource. It might be an API, worker, backend service, frontend application, or other deployable component.

Services can produce or receive messages (e.g [commands](/docs/development/guides/resources/messages/message-types/commands), [events](/docs/development/guides/resources/messages/message-types/events) or [queries](/docs/development/guides/resources/messages/message-types/queries)) and also be implementations of one or more specifications (OpenAPI, AsyncAPI, GraphQL).

Services can be part of a domain, system or independent.

### Internal and external services

Services in EventCatalog fall into two categories:

- **Internal services** — a resource your company owns and operates.
- **External services** — a third-party resource you integrate with but do not own (e.g Stripe, Twilio, or Snowflake). 

Both are just services under the hood. They share the same schema, can send and receive messages, be versioned, have owners, and carry specifications. The distinction only affects how they are grouped in the sidebar and rendered in the visualiser, so that the systems you operate are easy to tell apart from the ones you depend on.

