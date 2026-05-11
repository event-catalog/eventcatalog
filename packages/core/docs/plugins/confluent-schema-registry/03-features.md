---
sidebar_position: 1
keywords:
- components
sidebar_label: Features
title: Features
description: Features of AsyncAPI with EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

### Adding semantic meaning to schemas

Using the Confluent Schema Registry plugin, you can import and map your schemas to topics, services, domains and owners.

When you import a schema into EventCatalog your (event or command) will be created. The schema (JSON, Avro or Protobuf) will be stored against the message in EventCatalog. 

Each message (command or event) has their own `index.mdx` file. This is the place to store semantic meaning for the message. You can add a title, summary, description, and more (custom components, markdown, etc).

This gives you the opportunity to add meaning to your messages and make them easier to understand for teams.

When you reimport your schemas, your schemas will download the latest version of the schema from the Confluent Schema Registry and your semantic meaning will persist between imports. This means you can keep your message schemas up to date and your semantic meaning will be preserved.

### Visualize schemas, topics, services and domains

When you import your schemas into EventCatalog you can assign them to producers, consumers and topics (channels).

After the import process, you can use the EventCatalog Visualizer to see exactly how your schemas, topics, services and domains are mapped.

![Example Image](./images/visualizer.png)


### Downloading schemas

EventCatalog supports any schema format (e.g avro, json, protobuf, etc). When you import your schemas into EventCatalog you can view and download the schema directly from EventCatalog.

### Missing a feature?

If you are missing a feature, please let us know by opening an issue on [GitHub](https://github.com/event-catalog/eventcatalog/issues).

### Example

See the [eventcatalog-asyncapi-example](https://github.com/event-catalog/generators/tree/main/examples/generator-asyncapi) for a working example.