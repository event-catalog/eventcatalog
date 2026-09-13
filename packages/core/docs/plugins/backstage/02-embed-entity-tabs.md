---
sidebar_position: 3
sidebar_label: Embed entity tabs
title: Embed EventCatalog as entity tabs
description: Add documentation, message, schema, map, graph, and flow tabs to Backstage entity pages.
keywords:
  - backstage
  - entity tabs
  - entity layout
---

Use full-page components inside `EntityLayout.Route` when you want an EventCatalog view to have its own Backstage entity tab.

## Import the components

Import the general-purpose page component and any dedicated visualization components you need:

```tsx
import {
  EventCatalogArchitectureGraphEntityPage,
  EventCatalogDocumentationEntityPage,
  EventCatalogFlowEntityPage,
  EventCatalogSystemContextMapEntityPage,
} from '@eventcatalog/backstage-plugin-eventcatalog';
```

## Add resource views

The documentation, visualizer, discovery table, entity map, and schema explorer use `EventCatalogDocumentationEntityPage`:

```tsx
<EntityLayout.Route path="/eventcatalog-docs" title="EventCatalog: Docs">
  <EventCatalogDocumentationEntityPage page="docs" />
</EntityLayout.Route>

<EntityLayout.Route path="/eventcatalog-visualiser" title="EventCatalog: Visualiser">
  <EventCatalogDocumentationEntityPage page="visualiser" />
</EntityLayout.Route>

<EntityLayout.Route path="/eventcatalog-messages" title="EventCatalog: Messages">
  <EventCatalogDocumentationEntityPage page="discover" />
</EntityLayout.Route>

<EntityLayout.Route path="/eventcatalog-entity-map" title="EventCatalog: Entity Map">
  <EventCatalogDocumentationEntityPage page="entity-map" />
</EntityLayout.Route>

<EntityLayout.Route path="/eventcatalog-schema-explorer" title="EventCatalog: Schema Explorer">
  <EventCatalogDocumentationEntityPage page="schema-explorer" />
</EntityLayout.Route>
```

These components use the annotations on the current entity. To show a different resource, pass `id`, `version`, and `collection` explicitly:

```tsx
<EventCatalogDocumentationEntityPage
  page="entity-map"
  id="ordering"
  version="1.0.0"
  collection="domains"
/>
```

## Add an Architecture Graph

Use `EventCatalogArchitectureGraphEntityPage` to focus the catalog-wide graph on a resource. `depth` accepts `1`, `2`, or `3` and defaults to `2`.

```tsx
<EntityLayout.Route path="/eventcatalog-architecture" title="EventCatalog: Architecture">
  <EventCatalogArchitectureGraphEntityPage type="service" depth={2} />
</EntityLayout.Route>
```

The resource ID comes from the current entity unless you pass `id`. `type` is the singular alias for `collection`; for example, `type="service"` maps to `services`.

## Add a System Context Map

Omit the props to show the catalog-wide overview:

```tsx
<EntityLayout.Route path="/eventcatalog-system-context" title="EventCatalog: System Context">
  <EventCatalogSystemContextMapEntityPage />
</EntityLayout.Route>
```

To show one system, provide its ID and version:

```tsx
<EventCatalogSystemContextMapEntityPage
  system="order-management-system"
  version="1.0.0"
/>
```

On a mapped Backstage `System` entity, the component can read the system ID and version from annotations instead.

## Add a flow

A flow embed requires a flow ID and version:

```tsx
<EntityLayout.Route path="/eventcatalog-flow" title="EventCatalog: Flow">
  <EventCatalogFlowEntityPage flow="checkout-saga" version="1.0.0" />
</EntityLayout.Route>
```

You can instead annotate a Backstage entity with the flow ID, version, and `flows` collection, then omit the `flow` and `version` props.

For every supported prop and page value, see the [component reference](/docs/plugins/backstage/components).
