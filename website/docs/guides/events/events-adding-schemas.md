---
id: adding-schemas
title: Managing your Event Schemas
sidebar_label: Managing Schemas
slug: /events/adding-schemas
---

Events are facts of data that are sent across our Architecture. 

For developers to understand how to interact with the events they may be used to the **Schema Registry**.

Many brokers offer Schema Registries that allow you do document the details of your event payload using (JSON Schema, Avro, Thrift etc).

EventCatalog allows you to document your events and also add the schemas as part of your event documentation. This is a great way to help developers discover events and also understand the structure of your events.

**Schemas are optional to EventCatalog and EventCatalog is not opinionated about the format of your schemas.** EventCatalog will just read the file and display it to your teams.


**EventCatalog supports any schema format.**

:::tip
EventCatalog uses [Plugins](/docs/api/plugins) to help generate documentation automatically, this means you can write a plugin to fetch your schemas from third parties and use them so your schemas and docs are always in sync
:::

## Adding Schema to your Event

To add schema to your event you will need to add the `schema` file into your Event Directory.

EventCatalog supports any schema format and will render them to the screen along side your Event.

To add a Schema you will need to create a new file within your Event directory.

- `/events/{Event Name}/schema.{any extension}` 
  - (example `/events/UserSignedUp/schema.json`)

:::tip
EventCatalog does not care about the format of your schema, you just have to make sure the schema file is called `schema` with any extension and EventCatalog will pick up the schema.
:::

Once you create your schema you will need to render it within your Event Documentation.

You can choose where you want to render it within your markdown file and you just need to include the `<Schema/>` MDX Component.

### Example of Adding Schema into Markdown

Let's say we have a `UserCreated` event in `/events/UserCreated/index.md`.

```mdx title="/events/UserSignedUp/index.md"
---
name: UserSignedUp
version: 0.0.1
summary: |
  Tells us when the user has signed up
consumers:
    - Email Platform
producers:
    - User Service
---

Duis mollis quam enim, feugiat porta mi porta non. In lacus nulla, gravida nec sagittis vel, sagittis id
tellus. Vestibulum maximus velit eget massa pulvinar ornare. In vel libero nulla. Aliquam a leo risus.
Donec bibendum velit non nulla sollicitudin lacinia. Vestibulum imperdiet nunc eget
neque sagittis, eget volutpat purus ornare. Mauris malesuada finibus pretium.
Vestibulum suscipit tortor sit amet dolor tempor cursus. Nunc ac felis accumsan.

<Schema />

```

Let's add the Schema for this Event in `/events/UserCreated/schema.json`

```json
{
  "$id": "https://example.com/person.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "UserCreated",
  "type": "object",
  "properties": {
    "firstName": {
      "type": "string",
      "description": "The person's first name."
    },
    "lastName": {
      "type": "string",
      "description": "The person's last name."
    },
    "age": {
      "description": "Age in years which must be equal to or greater than zero.",
      "type": "integer",
      "minimum": 0
    }
  }
}
```

_This is just an example of JSON schema, you can have any schema you like_

Let's see how this schema would render in EventCatalog.

<!-- ![UserSignedUp with Schema Example](/img/guides/events/UserSignedUpExampleWithSchema.png) -->

## Versioning Schemas

With EventCatalog it is possible to version your Documentation, this means Events, Examples and Schemas can all be versioned and accessed.

If you want to learn how to version checkout [the guide](/docs/events/versioning).