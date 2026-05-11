---
sidebar_position: 1
keywords:
- EventCatalog Schemas
sidebar_label: Schema Explorer
title: Schema Explorer
description: Explore your schemas in the Schema Explorer
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.64.0" />

The Schema Explorer is a powerful tool that allows your team to quickly find, filter and understand your schemas in your Architecture (see [demo](https://demo.eventcatalog.dev/schemas)). 

Your teams can quickly find the schema, who owns it, who is producing or consuming it and get API (GET) access to your schemas for mocking or testing.

The schema explorer supports any schema format, including JSON, YAML, Avro, Protobuf, GraphQL, OpenAPI, AsyncAPI, etc.

![Example](./img/schema-explorer.png)

Using the Schema Explorer, you can:

- Quickly find schemas in your Architecture
- View diffs between versions of your schemas
- Quickly find who is consuming or producing your schemas
- Schema ownership to query who owns a schema
- Get API (GET) access to your schemas for mocking or testing

### How to use the Schema Explorer?

You can access the Schema Explorer from the sidebar, or by going to the `/schemas/explorer` page.

The page will take all the schemas from your EventCatalog and render them in a searchable list.

:::tip Schema Path
You need to set the `schemaPath` in your schema frontmatter to the path to your schema file for Events, Queries and Commands.

For services you need to specify the path to your specification file in the `specifications` frontmatter.
:::

The Schema Explorer is a powerful tool that allows your team to quickly find and understand your schemas in your Architecture (see [demo](https://demo.eventcatalog.dev/schemas)). The schema explorer supports any schema format, including JSON, YAML, Avro, Protobuf, GraphQL, OpenAPI, AsyncAPI, etc.

![Example](./img/schema-explorer-2.png)

##### Filters
You can use the filters to quickly find schemas in your Architecture. You can filter by name, message type and schema format.

##### Schema Preview

The schema preview will show you a preview of the schema in a readable format, you can use the `Schema` button to switch between different views of your schema (if they are supported, JSON or Avro).

##### API Access

For EventCatalog Scale users, you can get API (GET) access to your schemas for mocking or testing. 

##### Producers and Consumers

The producers and consumers section will show you who is producing or consuming the schema. You can click on the producer or consumer to see more information about them.

### Turn off the Schema Explorer

You can hide the Schema Explorer by setting the it's visibility to `false` in your `eventcatalog.config.js` file.

```js title="eventcatalog.config.js"
module.exports = {
  sidebar: [
    {
        id: '/schemas/explorer',
        visible: false,
    }
  ]
};
```