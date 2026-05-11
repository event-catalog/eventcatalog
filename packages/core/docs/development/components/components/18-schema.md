---
sidebar_position: 5
keywords:
- components
sidebar_label: Schema
title: Schema
description: Component for EventCatalog
---

The schema component renders a given schema into the page. 

**Schemas can be any file format (.avro, .json etc).**

:::tip
**The `<Schema/>` component renders any schema format.**

If you need to render JSON Schema, you can also use the [\<SchemaViewer/\> component](/docs/development/components/components/schema-viewer).

:::

### Usage

1. Add your schema file to your folder.
    - e.g `/events/MyEvent/schema.avro`

**Example**

```jsx /events/MyEvent/index.mdx
<Schema file="schema.avro" />
```

### Output
![Example output](./img/schema.png)

### Props
| Name                    | Type      | Default           | Description                                                       |
| ----------------------- | --------- | ----------------- | ----------------------------------------------------------------- |
| `file` (required)             | `string`  | (empty)           | The file to load into the schema block. Path is resolved by EventCatalog.                              |
| `title` (optional)                 | `string`  | (empty)           | Title to render in your schema block                              |
| `lang` (optional)             | `string`  | `json`           | The code language of the schema. Defaults to `json`. Over 100 languages are supported. [List of options can be found here.](https://github.com/shikijs/textmate-grammars-themes/blob/main/packages/tm-grammars/README.md)                             |

### Support

The `<Schema/>` component is supported in domains, services, and all messages, changelogs, and custom documentation pages.
