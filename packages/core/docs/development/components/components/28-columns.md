---
sidebar_position: 7.2
keywords:
  - components
  - columns
  - layout
sidebar_label: Columns
title: Columns
description: Place content side by side in your EventCatalog pages
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="4.11.0"/>

The `<Columns />` component places content side by side. Each `<Column />` inside it is one column.

A common use is to put an explanation on the left and the code it describes on the right.

**Example**

````mdx title="/events/OrderCreated/index.mdx"
<Columns cols={2}>

  <Column>

    ## Publish a review

    Publish the event after the review is stored.

  </Column>

  <Column>

    <CodeGroup>

      ```ts publish.ts
      await client.publish('ReviewSubmitted', review);
      ```

      ```python publish.py
      client.publish("ReviewSubmitted", review)
      ```

    </CodeGroup>

  </Column>

</Columns>
````

Leave a blank line after each opening tag and before each closing tag, so the content inside is parsed as Markdown.

### Output

![Two columns, with an explanation on the left and a code group on the right](./img/columns-code-group.png)

### Set the column widths

By default, every column has the same width. Use `ratio` to change that. The ratio needs one number per column.

```mdx title="/events/OrderCreated/index.mdx"
<Columns cols={2} ratio="2:1">

  <Column>

    This column is twice as wide as the next one.

  </Column>

  <Column>

    This column is narrower.

  </Column>

</Columns>
```

If the ratio does not match the number of columns, EventCatalog uses equal widths.

### Keep a column in view

Add `sticky` to a column to keep it in view while the reader scrolls past a longer column next to it. This is useful for long explanations next to a short code sample.

```mdx
<Column sticky>

  ...

</Column>
```

On narrow screens, columns stack on top of each other and `sticky` has no effect.

### Props

**`<Columns />`**

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `cols` | `number` | `2` | Number of columns, from 1 to 4. |
| `ratio` | `string` | | Relative column widths, for example `"2:1"` or `"1:2:1"`. |
| `className` | `string` | | Extra CSS classes for the columns. |

**`<Column />`**

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `sticky` | `boolean` | `false` | Keep the column in view while the page scrolls. |
| `className` | `string` | | Extra CSS classes for the column. |

### Support

The `<Columns />` component is supported in domains, systems, services, all messages, flows, changelogs, custom documentation pages, and [message usage examples](/docs/development/guides/resources/messages/add-usage-examples).
