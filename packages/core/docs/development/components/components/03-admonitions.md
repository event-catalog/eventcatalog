---
sidebar_position: 2
keywords:
- components
sidebar_label: Admonitions
title: Admonitions
description: Component for EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.16.6"/>

The admonitions syntax is used to render a block of text with a specific style. You can use it to highlight important information, warnings, or other types of content.

**Basic Example**

```md /events/OrderAmended/index.mdx
:::note
Some content with _Markdown_ syntax. Check [this api](https://eventcatalog.dev/).
:::

:::tip
Some content with _Markdown_ syntax. Check [this api](https://eventcatalog.dev/).
:::

:::warning
Some content with _Markdown_ syntax. Check [this api](https://eventcatalog.dev/).
:::

:::danger
Some content with _Markdown_ syntax. Check [this api](https://eventcatalog.dev/).
:::

```


### Output
![Example output](./img/admonitions.png)

### Support

The markdown syntax is supported in all pages in EventCatalog.
