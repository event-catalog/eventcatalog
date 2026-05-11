---
keywords:
- EventCatalog services
sidebar_label: Entities
title: Adding entities to services
description: Creating and managing entities within EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

:::tip What are entities?
Entities are a "**optional**" resource in EventCatalog. You can learn more reading our [entities guide](/docs/development/guides/domains/entities/adding-entities).

:::

<AddedIn version="2.36.0" />

Once you have [created your entities](/docs/development/guides/domains/entities/adding-entities) you can add them to your services.

To add an entity to a service you need to add the entity to the `entities` array in the service's markdown file.

```md title="/services/PaymentService/index.mdx"

---
id: PaymentService
name: PaymentService
version: 1.0.0
# This assumes you have an entity called Payment
entities:
  - id: Payment
    # Optional, if not provided the latest version will be used
    version: 1.0.0
---

Your service markdown...

```

## Visualize entity relationships

<AddedIn version="3.25.1" />

When a service has entities assigned, EventCatalog generates a dedicated **Entity Map** page in the visualizer at `/visualiser/services/{id}/{version}/entity-map`. A link to this view appears automatically in the service sidebar under the visualizer section.

The entity map shows each entity as a node and draws edges between entities that reference one another using the `references` field in their properties. This gives you a quick overview of how the domain model is structured inside a service.

To learn how to define relationships between entities, see the [entity map guide](/docs/development/guides/domains/entities/domain-entity-map).
