---
sidebar_position: 8
sidebar_label: Component reference
title: Backstage plugin component reference
description: Reference for all EventCatalog Backstage page and card components and their props.
keywords:
  - backstage
  - react components
  - props
---

Import components from `@eventcatalog/backstage-plugin-eventcatalog`.

## Full-page components

Use these components as children of `EntityLayout.Route`.

### `EventCatalogDocumentationEntityPage`

The general-purpose page component.

```tsx
<EventCatalogDocumentationEntityPage page="docs" />
```

Supported `page` values:

| Value | Embedded view | Resource selection |
| --- | --- | --- |
| `docs` | Resource documentation | Current mapping or `id`, `version`, and `collection` props |
| `visualiser` | Resource visualizer | Current mapping or override props |
| `discover` | Discovery table for the mapped collection | Current mapping or override props |
| `entity-map` | Resource entity map | Current mapping or override props; provide a version |
| `schema-explorer` | Catalog schema explorer | Global catalog view, rendered from a mapped entity page |
| `architecture-graph` | Catalog Architecture Graph | Prefer `EventCatalogArchitectureGraphEntityPage` |
| `system-context-map` | System Context Map | Prefer `EventCatalogSystemContextMapEntityPage` |
| `flow` | Flow visualizer | Prefer `EventCatalogFlowEntityPage` |

### `EventCatalogArchitectureGraphEntityPage`

Displays `/visualiser/graph` and focuses the graph on the selected resource.

```tsx
<EventCatalogArchitectureGraphEntityPage
  type="service"
  depth={2}
/>
```

The graph accepts `depth={1 | 2 | 3}` and defaults to `2`. The Architecture Graph currently uses the latest version of each resource, so `version` does not change its graph data.

### `EventCatalogSystemContextMapEntityPage`

Displays the catalog-wide System Context Map when no system is selected:

```tsx
<EventCatalogSystemContextMapEntityPage />
```

Pass `system` and `version` to display one system's context:

```tsx
<EventCatalogSystemContextMapEntityPage
  system="order-management-system"
  version="1.0.0"
/>
```

`id` is accepted as an alias for `system`. A mapped Backstage `System` entity can supply both values through annotations.

### `EventCatalogFlowEntityPage`

Displays a flow visualizer. A flow ID and version are required.

```tsx
<EventCatalogFlowEntityPage
  flow="checkout-saga"
  version="1.0.0"
/>
```

`id` is accepted as an alias for `flow`.

## Card components

Card components render the same embeds and fill the dimensions of their parent container.

| Component | View | Selection props |
| --- | --- | --- |
| `EventCatalogEntityVisualiserCard` | Resource visualizer | Current entity mapping |
| `EventCatalogEntityMessageCard` | Discovery table | Current entity mapping |
| `EventCatalogEntityEntityMapCard` | Entity map | Current mapping or `id`, `version`, and `collection` |
| `EventCatalogEntitySchemaExplorerCard` | Schema explorer | Global view |
| `EventCatalogEntityArchitectureGraphCard` | Architecture Graph | Current mapping or `id`, `type`/`collection`, and `depth` |
| `EventCatalogEntitySystemContextMapCard` | System Context Map | Overview, or `system`/`id` and `version` |
| `EventCatalogEntityFlowCard` | Flow visualizer | `flow`/`id` and `version`, or current entity mapping |

Set a concrete height on the parent grid item. See [Control embed theme and size](/docs/plugins/backstage/control-theme-and-size).

## Shared props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `id` | `string` | Entity annotation | Override the EventCatalog resource ID. Also aliases `system` and `flow` on their dedicated components. |
| `version` | `string` | Entity annotation | Override the EventCatalog version. |
| `collection` | `string` | Entity annotation or inferred value | Override the EventCatalog collection. |
| `type` | `string` | None | Alias for `collection`; singular known types are converted to plural collections. |
| `theme` | `'light' \| 'dark'` | Saved EventCatalog theme | Force the color theme for this embed. |

## Specialized props

| Prop | Component | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `page` | `EventCatalogDocumentationEntityPage` | `EventCatalogPage` | `docs` | Select the embedded EventCatalog view. |
| `depth` | Architecture Graph components | `1 \| 2 \| 3` | `2` | Number of relationship hops around the focused resource. |
| `system` | System Context Map components | `string` | None | EventCatalog system ID. Omit for the overview. |
| `flow` | Flow components | `string` | Entity annotation | EventCatalog flow ID. |

## Exported types

The package exports these public types:

- `EventCatalogArchitectureGraphDepth`
- `EventCatalogArchitectureGraphEntityPageProps`
- `EventCatalogDocumentationEntityPageProps`
- `EventCatalogEmbedTheme`
- `EventCatalogEmbedThemeProps`
- `EventCatalogFlowEntityPageProps`
- `EventCatalogSystemContextMapEntityPageProps`
