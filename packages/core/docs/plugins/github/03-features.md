---
sidebar_position: 1
keywords:
- components
sidebar_label: Features
title: Features
description: Features of the Github Plugin with EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

### Adding semantic meaning to schemas

Using the Github plugin with EventCatalog, you can import and keep your schemas in Sync with your documentation.

When you import a schema into EventCatalog the schema will be mapped to your event, query or command. The schema (any format, e.g JSON, Avro, Protobuf) will be stored against the message in EventCatalog. 

Each message (command, event, query) has their own `index.mdx` file. This is the place you can write your documentation for the message. Everytime you reimport your schemas, your documentation will be preserved.

This pattern gives you the flexibility to add business meaning to your messages and make them easier to understand for teams whilst keeping your schemas up to date and in sync with the real world.

### Visualize producers, consumers and your schemas.

When you import your schemas into EventCatalog you can assign them to producers and consumers.

After the import process, you can use the EventCatalog Visualizer ([see demo](https://demo.eventcatalog.dev/visualiser/domains/E-Commerce/1.0.0)) to see exactly how your messages, producers and consumers are mapped.

![Example Image](./images/visualizer.png)

### Downloading schemas

EventCatalog supports any schema format (e.g avro, json, protobuf, etc). When you import your schemas into EventCatalog users can view and download the schema directly from EventCatalog.

You can use the [Schema](/docs/development/components/components/schema) or [SchemaViewer](/docs/development/components/components/schema-viewer) components in your markdown to display them in your documentation.

### Missing a feature?

If you are missing a feature, please let us know by opening an issue on [GitHub](https://github.com/event-catalog/eventcatalog/issues).

### Example

See the [eventcatalog-github-example](https://github.com/event-catalog/generators/tree/main/examples/generator-github) for a working example.