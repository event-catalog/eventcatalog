---
sidebar_position: 2
id: components
title: MDX Components
---  

### `<Schema />`

Supported in 
- event markdown files

This component will render your schema to the document. To make this work you will need to add a `schema` file into your event directory.

For more information check out the [schema guide for events](/docs/events/adding-schemas).

### `<Mermaid />`

Supported in 
- event markdown files
- service markdown files

This component will render your mermaid diagrams into the document. 

:::tip
Remember the relationship between events and services is stored within the event itself through the `producer` and `consumer` frontmatter properties.
:::

For more information check out the [mermaid guide for events](/docs/events/consumers-and-producers) and [mermaid guide for services](/docs/services/producers-consumers).