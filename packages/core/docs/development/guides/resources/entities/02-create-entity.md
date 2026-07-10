---
keywords:
- EventCatalog entities
sidebar_position: 2
sidebar_label: Create an entity
title: Create an entity
description: Create an entity in EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PromptBox from '@site/src/components/MDX/PromptBox';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

An entity is a documented business object or concept that your architecture cares about. You can document entity properties, and assign them to any domain, system or service in your architecture.

![Example entity page in EventCatalog](./img/entity-example.png)

## Creating an entity

### Automatic Creation

<PromptBox preview="Create a new EventCatalog entity">
Read https://www.eventcatalog.dev/docs/development/guides/resources/entities/create-entity.md and https://www.eventcatalog.dev/docs/development/guides/resources/entities/reference.md then help me create a new EventCatalog entity in my catalog.

Ask me for the entity name, business meaning, summary, identifier field, important properties, relationships to other entities, and where the entity should live. Then create the correct entities/{'{Entity Name}'}/index.mdx, domains/{'{Domain Name}'}/entities/{'{Entity Name}'}/index.mdx, systems/{'{System Name}'}/entities/{'{Entity Name}'}/index.mdx, or services/{'{Service Name}'}/entities/{'{Entity Name}'}/index.mdx file with frontmatter and starter markdown.

Use the EntityPropertiesTable component when it helps explain the properties.
</PromptBox>

Copy this prompt and paste it into your coding agent. Your agent can help you decide where the entity should live, define the properties, and create the starter documentation.

### Manual Creation

Most teams start by creating shared entities at the root of the catalog.

<ProjectTree
  items={[
    {
      name: 'entities',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'order',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'index.mdx', highlight: true }],
        },
        {
          name: 'customer',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'index.mdx', highlight: true }],
        },
      ],
    },
  ]}
/>

You can also keep entities inside the resource folder they clearly belong to.

<ProjectTree
  items={[
    {
      name: 'domains',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'Ordering',
          type: 'folder',
          defaultOpen: true,
          children: [
            {
              name: 'entities',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'order',
                  type: 'folder',
                  defaultOpen: true,
                  children: [{ name: 'index.mdx', highlight: true }],
                },
              ],
            },
          ],
        },
      ],
    },
  ]}
/>

## Create the entity file

Create an `index.mdx` file for the entity.

```md title="/entities/order/index.mdx"
---
# Unique identifier for the entity. Used in URLs and resource references.
id: order
# Friendly display name shown in EventCatalog.
name: Order
# Version of this entity documentation.
version: 1.0.0
# Short summary shown in lists, sidebars, and previews.
summary: Represents a customer's purchase.
# The property that uniquely identifies this entity.
identifier: orderId
# Optional. Marks this entity as the aggregate root for the model.
aggregateRoot: true
# Teams or users that own this entity.
owners:
  - ordering-platform
# Properties that describe the shape of the entity.
properties:
  # Unique identifier for this order.
  - name: orderId
    # Data type for the property.
    type: string
    # Whether this property is required.
    required: true
    # Human-readable description of what the property represents.
    description: Unique identifier for the order.
  # Identifier for the customer that placed the order.
  - name: customerId
    # Data type for the property.
    type: string
    # Whether this property is required.
    required: true
    # Human-readable description of what the property represents.
    description: Customer that placed the order.
    # Entity this property references.
    references: customer
    # Label used to describe the relationship in entity maps.
    relationType: placedBy
    # Identifier property on the referenced entity.
    referencesIdentifier: customerId
  # Current lifecycle state of the order.
  - name: status
    # Data type for the property.
    type: string
    # Whether this property is required.
    required: true
    # Human-readable description of what the property represents.
    description: Current lifecycle state of the order.
---

## Overview

The Order entity represents a customer's purchase and tracks the state required to fulfil, pay for, and ship that purchase.

<EntityPropertiesTable />
```


## Next steps

- [Model entity relationships](/docs/development/guides/resources/entities/model-entity-relationships)
- [Add entities to resources](/docs/development/guides/resources/entities/add-entities-to-resources)
- [Visualize entity maps](/docs/development/guides/resources/entities/entity-maps)
- [Review the entities reference](/docs/development/guides/resources/entities/reference)
