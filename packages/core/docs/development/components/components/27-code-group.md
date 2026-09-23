---
sidebar_position: 7.1
keywords:
  - components
  - code group
  - code examples
sidebar_label: CodeGroup
title: CodeGroup
description: Show the same code example in several languages or files
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="4.11.0"/>

The `<CodeGroup />` component groups several fenced code blocks into one panel. Readers switch between them with tabs or a dropdown, and copy the one they need.

Use it when the same example exists in more than one language, or when an example is split across several files.

![CodeGroup in dropdown mode, showing a TypeScript example with a language picker for TypeScript, Python, Java, C#, and Go](./img/code-group-dropdown.png)

**Example**

Wrap your code blocks in `<CodeGroup>`. The text after the language becomes the label for each block.

````mdx title="/events/OrderCreated/index.mdx"
<CodeGroup>

```ts publish.ts
await client.publish('OrderCreated', order);
```

```python publish.py
client.publish("OrderCreated", order)
```

</CodeGroup>
````

Leave a blank line after the opening tag and before the closing tag, so the code blocks are parsed as Markdown.

### Output

![CodeGroup with TypeScript and Python tabs, shown next to an explanation using Columns](./img/columns-code-group.png)

### Labels

Each code block needs a label. EventCatalog picks it in this order:

1. A `title` in the code fence, for example ` ```ts title="publish.ts" `
1. The first word after the language, for example ` ```ts publish.ts `
1. The language, for example `ts`

EventCatalog also shows an icon for the language of each block, for example TypeScript, Python, Java, Go, C#, or JSON.

When a reader picks a block, every other code group on the page with a block of the same label switches too. If a page has several examples that each include `publish.py`, choosing Python once shows Python everywhere.

### Use a dropdown

Tabs work well for two or three blocks. For more, add `dropdown` to show a language picker instead.

````mdx title="/events/OrderCreated/index.mdx"
<CodeGroup dropdown>

```javascript publish-order.js
await client.publish("OrderCreated", order);
```

```python publish_order.py
client.publish("OrderCreated", order)
```

```java PublishOrder.java
client.publish("OrderCreated", order);
```

```csharp PublishOrder.cs
await client.PublishAsync("OrderCreated", order);
```

</CodeGroup>
````

### Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `dropdown` | `boolean` | `false` | Show a dropdown to switch between code blocks instead of tabs. |
| `className` | `string` | | Extra CSS classes for the group. |

### Support

The `<CodeGroup />` component is supported in domains, systems, services, all messages, flows, changelogs, custom documentation pages, and [message usage examples](/docs/development/guides/resources/messages/add-usage-examples).

Pair it with [`<Columns />`](/docs/development/components/components/columns) to show code next to the text that explains it.
