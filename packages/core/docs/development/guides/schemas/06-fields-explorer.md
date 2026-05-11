---
sidebar_position: 2
keywords:
- EventCatalog schema fields explorer
- field traceability
- field conflict detection
- schema field search
sidebar_label: Fields Explorer
title: Fields Explorer
description: Browse, search, and trace schema fields across all messages in your catalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import EventCatalogPro from '@site/src/components/MDX/EventCatalogPro';

<AddedIn version="3.26.0" />

:::info SSR required
The Fields Explorer requires EventCatalog to run in SSR (server-side rendering) mode. It is not available in static builds.
:::

<iframe width="100%" height="415" src="https://www.youtube.com/embed/PQIBATgtuKs?si=TagMKL49ZD_G_HYE" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


The Fields Explorer gives you a catalog-wide view of every schema field across all your events, commands, and queries (supporting AVRO, JSON, and Proto). Search and filter fields by name, format, or message type, then click any field to trace exactly which services produce and consume it.


![Field Explorer](./img/field-search.png)

## Get started

Fields are indexed automatically when EventCatalog starts in SSR mode. No additional configuration is required beyond adding schemas to your messages via the `schemaPath` frontmatter property.

The following schema formats are supported:

- JSON Schema
- Avro
- Protobuf

Once your catalog is running, navigate to `/schemas/fields` or click **Schema Fields** in the sidebar to open the Fields Explorer.

## Search and filter

The left sidebar contains all filtering options.

**Full-text search** -- Type in the search box to find fields by path, type, or description. The search uses prefix matching, so `ord` will match `orderId`, `orderStatus`, etc.

**Schema format** -- Filter results to a single schema format (json-schema, avro, or proto). The count next to each option shows how many fields match.

**Message type** -- Narrow results to fields that appear only in events, commands, or queries.

**Shared fields only** -- Show only fields whose path appears in more than one message. This is useful for spotting reused data structures and understanding cross-message coupling.

## Read the fields table

Each row in the table represents a single field in a specific message schema.

| Column | Description |
|---|---|
| Field Path | The dotted path to the field (e.g. `order.shipping.address`). Hover to reveal a copy button. |
| Type | The data type declared in the schema. |
| Message | The event, command, or query that contains this field. Click to open that message's documentation page. |
| Format | The schema format the field was extracted from. |
| Required | Shown when the field is marked required in the schema. |
| Owners | Teams or users who own the message this field belongs to. |

## Trace field lineage

<EventCatalogPro plan="Scale" />

Clicking any field row opens a full-screen **Field Traceability** panel. This panel shows a node graph with three layers:

1. **Producer services** -- services that publish the message containing this field
2. **Messages** -- the events, commands, or queries that carry the field
3. **Consumer services** -- services that subscribe to those messages

The right-hand panel lists the same information in a collapsible format and lets you click any node to focus the graph on it.

![Field Explorer](./img/field-search-graph.png)

_[If you want to try this feature you can get a 14 day free trail of EventCatalog Scale](https://eventcatalog.cloud)_

## Detect type conflicts

<EventCatalogPro plan="Scale" />

When the same field path appears in multiple messages with different data types, the Fields Explorer surfaces a **type conflict**.

![Field Explorer](./img/type-conflicts-row.png)

In the table, a conflict is shown as an amber warning badge with the number of distinct types (for example, `2 types`). Hovering reveals a tooltip listing each type and the count of schemas that use it.

![Field Explorer](./img/type-conflicts-visual.png)

Inside the Field Traceability panel, a **Type Conflict** section appears in the right-hand details panel. It lists each type variant and how many schemas use it. When conflicts exist, the node graph renders a separate field node per type, making it immediately clear which messages use each variant.

To see only conflicting fields across your entire catalog, enable the **Conflicting fields** filter in the sidebar.

## Understand the fields index

When EventCatalog starts in SSR mode it builds a SQLite index at `.eventcatalog/fields.db` inside your catalog directory. The index is rebuilt on every start, so it always reflects the latest version of each message schema.

Only the **latest version** of each event, command, and query is indexed. Older versions are not included.

If a message has no `schemaPath` set, it is skipped silently. If a schema file cannot be parsed (for example, due to a syntax error), the indexer emits a warning in the startup logs and continues.

## Hide the Fields Explorer

You can hide the Fields Explorer from the sidebar by setting its visibility to `false` in `eventcatalog.config.js`.

```js title="eventcatalog.config.js"
module.exports = {
  sidebar: [
    {
      id: '/schemas/fields',
      visible: false,
    }
  ]
};
```
