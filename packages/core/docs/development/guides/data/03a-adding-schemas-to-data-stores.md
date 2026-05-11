---
sidebar_position: 2
keywords:
- EventCatalog domains
sidebar_label: Adding schemas to data stores
title: Adding schemas to data stores
description: Adding schemas to data stores
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.59.0" />

EventCatalog supports any schema format.

When you document your data stores, you may want to also include schemas, queries, or other files that are relevant to your data store.

You can attach this information in two ways:

- [Use codeblocks to render your schema](#using-codeblocks-to-render-your-schema)
- [Use the `<Schema/>` component to render your schema from a file](#using-the-schema-component-to-render-your-schema-from-a-file)

## Using codeblocks to render your schema

You can use codeblocks to render your schema in your markdown files.

Here is an example of a SQL codeblock:

```md
```sql
  CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255)
  );
```_
```

You can learn more about codeblocks and configuring them in the [codeblocks documentation](/docs/api/code-blocks).

## Using the `<Schema/>` component to render your schema from a file

If you prefer to have your schemas, or information about your data store in a file, you can use the `<Schema/>` component to render your schema from a file.

First you need to add your file in the directory of your data store

Example

- `/containers/OrdersDatabase/schema.sql`
- `/containers/OrdersDatabase/queries.sql`

```md
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

You can an example of this in the [EventCatalog Demo](https://demo.eventcatalog.dev/docs/containers/orders-db/0.0.1).

:::tip Versioning information
Remember everything in EventCatalog can be versioned. So when your data store changes you can [version your data stores](/docs/development/guides/data/versioning-and-lifecycle/versioning), and write [changes logs](/docs/development/guides/data/versioning-and-lifecycle/changelog) to help your teams understand what has changed.
:::
