---
sidebar_position: 2
keywords:
- EventCatalog Schemas
sidebar_label: Add schemas to messages
title: Add schemas to messages
description: Attach schemas to events, commands, and queries in EventCatalog.
---

import ProjectTree from '@site/src/components/MDX/ProjectTree';

Schemas can be added to any message type (Event, Command or Query).

## Adding a schema to a message

Add the schema file next to the message and reference it with `schemaPath` in the message frontmatter.

```md title="/events/InventoryAdjusted/index.mdx"
---
id: InventoryAdjusted
version: 0.0.4
schemaPath: schema.avro
---
```

<ProjectTree
  items={[
    {
      name: 'events',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'InventoryAdjusted',
          type: 'folder',
          defaultOpen: true,
          children: [
            { name: 'index.mdx' },
            { name: 'schema.avro', highlight: true },
          ],
        },
      ],
    },
  ]}
/>

## Rendering schemas

You can render schema files inside the message page with the [schema components](/docs/development/components/components/schema-viewer).

```md title="/events/InventoryAdjusted/index.mdx"
<!-- Raw codeblock for your schema -->
<Schema file="schema.avro" />

<!-- Richer UI experinece for your schemas -->
<SchemaViewer file="schema.avro" />
```

Use `<Schema />` when you want to render the raw schema as a code block. Use `<SchemaViewer />` when you want a richer schema viewer for supported formats.

## Next steps

Once schemas are attached to your messages, you can use the [Schema Explorer](/docs/development/guides/resources/schemas/explore-schemas/schema-explorer), [Fields Explorer](/docs/development/guides/resources/schemas/explore-schemas/fields-explorer), and [Schema API](/docs/development/guides/resources/schemas/schema-api) to make them easier to find and use.
