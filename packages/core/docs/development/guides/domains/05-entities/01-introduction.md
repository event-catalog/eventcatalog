---
keywords:
- EventCatalog domains
sidebar_label: What are entities?
title: What are entities?
description: What are entities? Why are they useful for event-driven architectures?
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.36.0" />

In Domain-Driven Design, an entity is an object with a unique identity that stays the same over time, even if its data changes. It’s defined by this identity, not just its properties. For example, a `Customer` with a unique ID is an entity, even if their name or address changes.

In Domain-Driven Design, entities are the core building blocks of a domain—they represent key concepts or things within that domain that have a unique identity. The domain defines the business logic and rules, and entities bring that logic to life by modeling real-world objects or roles, like `Order`, `Customer`, or `Invoice`. Each entity lives within a bounded context of the domain, ensuring it behaves consistently according to that part of the business.

**In EventCatalog entities are optional.**, if you don't want to add entity documentation you can skip this resource.

### How do entities work in EventCatalog?

Entities are a "**optional**" resource in EventCatalog and like every other resource in EventCatalog they are defined in markdown files.

Entities can be added to your `domains` and `services`.

