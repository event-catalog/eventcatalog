---
sidebar_position: 20
keywords:
- components
sidebar_label: SchemaViewer
title: SchemaViewer
description: Render JSON schema in EventCatalog
---

A Schema Viewer component for EventCatalog that supports JSON schemas and Avro schemas.

Renders the given schema (.json, .yaml, .avro, .avsc) into the page.

:::tip
**The `<SchemaViewer/>` component only works with JSON Schema and Avro schemas.**

If you need to render other schema formats, please use the [\<Schema/\> component](/docs/development/components/components/schema).

_Avro support was added in 2.64.0. Please upgrade to the latest version of EventCatalog to use this component._
:::

### Usage

1. Add a JSON or Avro schema file to your folder.
    - e.g `/events/MyEvent/schema.json`
    - e.g `/events/MyEvent/schema.avro`

**Example**

```jsx /events/MyEvent/index.mdx
<SchemaViewer file="schema.json" title="JSON Schema" maxHeight="500" search="true" expand="true" />

<SchemaViewer file="schema.avro" title="Avro Schema" maxHeight="500" />

<SchemaViewer file="schema.yaml" title="YAML Schema" maxHeight="500" />
```

### Output
![Example output](./img/schemaviewer.png)

### Props
| Name                    | Type      | Default           | Description                                                       |
| ----------------------- | --------- | ----------------- | ----------------------------------------------------------------- |
| `title` (optional)                 | `string`  | (empty)           | Title to render above your schema                               |
| `file` (required)             | `string`  | (empty)           | The file to load into the schema block. Path is resolved by EventCatalog.                              |
| `maxHeight` (optional)             | `string`  | "500"           | Max height of the JSON Schema viewer (in pixels).                              |
| `search` (optional)             | `boolean`  | false           | Renders a search input in the viewer                             |
| `expand` (optional)             | `boolean`  | false           | Expands all properties by default                             |
| `showRequired` (optional)             | `boolean`  | false           | **Avro Schemas only**: Will show which fields are required. Fields are required if they don't have a default value or null as their type. As documented in the [Avro Specification](https://avro.apache.org/docs/++version++/specification/)                           |


## Rendering multiple schemas

You can use the SchemaViewer multiple times in your page.

**Example**

```md /events/MyEvents.index.mdx
The Inventory Adjusted event is triggered whenever there is a change in the inventory levels of a product. 
This could occur due to various reasons such as receiving new stock, sales, returns, or manual adjustments by the inventory management team.

<SchemaViewer file="schema.json" title="JSON Schema" maxHeight="500" id="json-schema" />
<SchemaViewer file="old-schema.json" title="Another Version" maxHeight="500" id="json-schema2" />
<SchemaViewer file="new-schema.yml" title="Another Version" maxHeight="500" id="yaml-schema" />
```

### Support

The `<SchemaViewer/>` component is supported in domains, services, and all messages, changelogs, and custom documentation pages.
