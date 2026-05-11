---
keywords:
- EventCatalog commands
sidebar_label: Adding schemas to messages
title: Adding schemas to messages
description: Understand how to add schemas to your messages.
sidebar_position: 2
---

EventCatalog allows you to attach schemas to any message. 

**EventCatalog supports any schema format. (e.g Avro, Protobuf, JSON etc)**

![Example](../../img/commands/schemas.png)

Schemas are very useful for users that want to understand the properties of your message and the context behind them.

### Adding schemas to your messages

To add a schema to your message you need to add the `schemaPath` value in your message frontmatter and drop the schema file into your message folder.

```md title="/{events|commands|queries}/InventoryAdjusted/index.mdx (example)"
---
id: InventoryAdjusted
version: 0.0.4
# relative path to the schema file
schemaPath: schema.avro
---
```

Folder structure:
```md
/commands (or /events or /queries)
  /InventoryAdjusted
    index.mdx
    schema.avro
```

#### Schema Components

EventCatalog supports two components to render schemas into your message page.

1. `<Schema/>` - Renders the schema into your message page as a JSON code block
2. `<SchemaViewer/>` - Renders the schema into your message page using a nice Schema component (JSON and Avro supported)

```md title="/{events|commands|queries}/InventoryAdjusted/index.mdx (example)"
<!-- Renders the given schema into the page, as a JSON code block -->
<Schema file="schema.avro" />

<!-- Renders the given schema into the page using a nice Schema component -->
<SchemaViewer file="schema.avro" />
```

#### Adding example usage for your message

Once you document your schema, you can also add `Usage Examples` for your schemas to help your teams understand how they schemas are used in a list of different ways.

You can read more about in the [usage example documentation](/docs/development/guides/messages/common/examples).