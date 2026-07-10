---
sidebar_position: 3
keywords:
- EventCatalog schemas
- EventCatalog data stores
sidebar_label: Add schemas to data stores
title: Add schemas to data stores
description: Attach schemas, queries, and data files to data stores in EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

<AddedIn version="2.59.0" />

EventCatalog supports any schema format.

When you document your [data stores](/docs/development/guides/resources/data/introduction), you may want to include schemas, queries, or other files that explain the data store.

You can attach this information in two ways:

- [Use codeblocks to render your schema](#using-codeblocks-to-render-your-schema)
- [Use the `<Schema/>` component to render your schema from a file](#using-the-schema-component-to-render-your-schema-from-a-file)

## Using codeblocks to render your schema

You can use codeblocks to render your schema directly in your Markdown files.

Here is an example of a SQL codeblock:

````md
```sql
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255)
);
```
````

You can learn more about codeblocks and configuring them in the [codeblocks documentation](/docs/api/code-blocks).

## Using the `<Schema/>` component to render your schema from a file

If you prefer to keep your schemas or queries in separate files, add them to the data store folder and render them with the `<Schema/>` component.

<ProjectTree
  items={[
    {
      name: 'containers',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'OrdersDatabase',
          type: 'folder',
          defaultOpen: true,
          children: [
            { name: 'index.mdx' },
            { name: 'schema.sql', highlight: true },
            { name: 'queries.sql', highlight: true },
          ],
        },
      ],
    },
  ]}
/>

```md title="/containers/OrdersDatabase/index.mdx"
<!-- Render the file into your page -->
<Schema file="schema.sql" lang="sql" title="Users Table" />

<!-- Render the schemas separately in an AccordionGroup -->
<AccordionGroup>
  <Accordion title="Users Table">
    <!-- Load the schema from the file -->
    <Schema file="schema.sql" lang="sql" title="Users Table" />
  </Accordion>
  <Accordion title="Common Queries">
    <!-- Load the queries from the file -->
    <Schema file="queries.sql" lang="sql" title="Common Queries" />
  </Accordion>
</AccordionGroup>
```

You can see an example of this in the [EventCatalog Demo](https://demo.eventcatalog.dev/docs/containers/orders-db/0.0.1).

:::tip Versioning information
Everything in EventCatalog can be versioned. When your data store changes, keep older documentation in a `versioned` folder and add a `changelog.mdx` file to explain what changed.
:::
