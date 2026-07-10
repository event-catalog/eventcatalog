---
keywords:
- EventCatalog entities
- Domain model
sidebar_label: What are entities?
title: What are entities?
description: What are entities? Why are they useful in EventCatalog?
---

import AddedIn from '@site/src/components/MDX/AddedIn';

An entity is a documented business object or concept that your architecture cares about.

Examples of entities include `Order`, `Customer`, `Invoice`, `Payment`, `Shipment` `Product`.

Entities are useful when you want to describe the shape and relationships of your domain model, separate from the services, messages, and systems that use it. For example, in an event-driven system, `OrderCreated` might be the message, `OrderService` might be the producer, and `Order` is the entity that gives the event business meaning.

Entities can be referenced from [Domains](/docs/development/guides/domains/introduction), [Systems](/docs/development/guides/systems/introduction) and [Services](/docs/development/guides/resources/services/introduction).

## Next steps

- [Create an entity](/docs/development/guides/resources/entities/create-entity)
- [Model entity relationships](/docs/development/guides/resources/entities/model-entity-relationships)
- [Add entities to resources](/docs/development/guides/resources/entities/add-entities-to-resources)
- [Visualize entity maps](/docs/development/guides/resources/entities/entity-maps)
- [Review the entities reference](/docs/development/guides/resources/entities/reference)
