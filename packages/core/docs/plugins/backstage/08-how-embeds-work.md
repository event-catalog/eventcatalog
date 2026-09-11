---
sidebar_position: 9
sidebar_label: How embeds work
title: How EventCatalog embeds work in Backstage
description: Understand resource mapping, iframe rendering, embed mode, themes, and sizing.
keywords:
  - backstage
  - iframe
  - architecture
---

The Backstage plugin is a frontend integration. EventCatalog remains the source of the documentation and visualizations; the plugin selects a view and embeds it inside a Backstage entity page.

## Resource mapping

Backstage and EventCatalog use different resource models. The plugin connects them with three annotations:

- `eventcatalog.dev/id` identifies the EventCatalog resource.
- `eventcatalog.dev/version` selects its version.
- `eventcatalog.dev/collection` identifies the resource collection, such as `services`, `domains`, or `events`.

Keeping this mapping on the Backstage entity makes the relationship portable with the entity definition. Props can override the annotations when a tab or card deliberately shows a different resource.

## URL construction and embed mode

The plugin combines the configured `eventcatalog.URL`, the selected component, and the resolved resource mapping. It adds `embed=true` to the EventCatalog URL.

Embed mode removes EventCatalog navigation that would duplicate or cover Backstage navigation. Interactive content such as graph controls, filters, schema tabs, and flow exploration remains available inside the iframe.

Specialized views use their native EventCatalog routes:

- Architecture Graph: `/visualiser/graph`, with `focus` and `depth` query parameters
- System Context Map overview: `/visualiser/system-context-map`
- one system's context: `/visualiser/systems/{id}/{version}/context`
- flow: `/visualiser/flows/{id}/{version}`
- schema explorer: `/schemas/explorer`

## Theme selection

Passing `theme="light"` or `theme="dark"` adds a theme request to the embed URL. EventCatalog applies it before the embedded page paints, avoiding a flash of the wrong theme. The override is local to the embed and does not replace the visitor's saved EventCatalog preference.

Without an explicit prop, the embedded page follows that saved preference. The Backstage theme is not automatically mirrored because the two applications have separate theme state.

## Height and layout

The plugin's wrapper and iframe both use the full width and height available from their parent. This makes the same component suitable for a full route or a grid card, but the parent still determines how much space exists.

`height: 100%` only resolves when the ancestor layout has a defined height. Entity tabs typically provide that layout. Overview grid items should set an explicit height so graphs, tables, and schema panels can use the complete card area.

## Browser access

The iframe loads EventCatalog directly in the user's browser. The configured EventCatalog URL must therefore be reachable by users of Backstage and permit embedding in your deployment environment. Backstage does not copy EventCatalog content into its own backend.
