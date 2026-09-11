---
sidebar_position: 5
sidebar_label: Theme and sizing
title: Control an embed's theme and size
description: Select a light or dark EventCatalog theme and make embeds fill their Backstage containers.
keywords:
  - backstage
  - theme
  - iframe height
---

Every EventCatalog page and card component accepts a `theme` prop.

## Select a theme

Set `theme` to `light` or `dark`:

```tsx
<EventCatalogDocumentationEntityPage page="docs" theme="dark" />

<EventCatalogEntityArchitectureGraphCard
  type="service"
  depth={2}
  theme="light"
/>
```

When `theme` is omitted, the embedded page uses the visitor's saved EventCatalog theme. The explicit prop affects that embed; it does not overwrite the visitor's saved preference.

To make every EventCatalog view in a Backstage app consistent, pass the same theme to each page and card component.

## Give cards an explicit height

The plugin iframe uses `height: 100%`, which means its height is inherited from its parent. Set the height on the Backstage grid item or another wrapping element:

```tsx
<Grid item xs={12} style={{ height: 800 }}>
  <EventCatalogEntityArchitectureGraphCard
    type="service"
    depth={2}
    theme="dark"
  />
</Grid>
```

Avoid percentage heights unless every ancestor has a defined height. A fixed height, viewport-relative height, or layout-controlled height gives the iframe a concrete area to fill:

```tsx
<Grid item xs={12} style={{ height: 'calc(100vh - 240px)', minHeight: 600 }}>
  <EventCatalogEntitySchemaExplorerCard theme="dark" />
</Grid>
```

Full-page components automatically fill the height made available by the `EntityLayout.Route`. If a custom route wrapper collapses, give that wrapper an explicit height too.
