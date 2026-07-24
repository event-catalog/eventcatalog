---
keywords:
- EventCatalog entities
- Entity maps
sidebar_position: 5
sidebar_label: Entity maps
title: Entity maps
description: Visualize entity relationships in EventCatalog.
---

Entity maps help teams understand the relationships between business concepts.

When entities are assigned to a domain or service, EventCatalog can create an entity map that shows:

- The entities assigned to that resource.
- Relationships between those entities.
- Entities referenced from outside the current resource.
- Which entities are owned by the current domain or service context.

Entity properties that contain embedded objects can be expanded directly in the map. Relationships configured with `referenceTarget: entity` connect to the entity header, while existing property-level relationships continue to connect to the referenced identifier or property.

![Entity Map](./img/entity-map.png)

## Open an entity map in the visualizer

Domains and services have dedicated entity map routes:

```txt
/visualiser/domains/{id}/{version}/entity-map
/visualiser/services/{id}/{version}/entity-map
```

When a domain or service has entities assigned, an **Entity Map** link appears automatically in the resource sidebar under the visualizer section.

## Embed an entity map

You can also embed an entity map on a page using the `<EntityMap />` component.

```mdx
<EntityMap id="ordering" title="Ordering Entity Map" />
```

![Entity Map Component](./img/entity-map-component.png)

Use embedded entity maps when you want the model to appear directly in domain, service, or custom documentation.

## Next steps

- [Model entity relationships](/docs/development/guides/resources/entities/model-entity-relationships)
- [EntityMap component reference](/docs/development/components/components/entitymap)
