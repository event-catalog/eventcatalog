---
sidebar_position: 6
keywords:
  - components
sidebar_label: Tabs
title: Tabs
description: Render tabs in your EventCatalog pages
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.16.5"/>

The `<Tabs />` component is a EventCatalog component that will render a tabs into your markdown page.

Add Tabs and TabItems into your markdown file.

**Example**

```jsx /services/MyService/index.mdx
<Tabs>
  <TabItem title="Tab 1">
    This is the content for tab 1
  </TabItem>
  <TabItem title="Tab 2">
    This is the content for tab 2
  </TabItem>
</Tabs>
```

**Example with code as child**

```jsx /services/MyService/index.mdx
<Tabs>
  <TabItem title="Tab 1">
    ``sh
    This is the content for tab 1
    ``
  </TabItem>
  <TabItem title="Tab 2">
    ``js
    console.log('This is the content for tab 2');
    ``
  </TabItem>
</Tabs>
```

### Output
![Example output](./img/tabs.png)

See example in the [demo EventCatalog application](https://demo.eventcatalog.dev/docs/events/InventoryAdjusted/1.0.1).

### Support

The `<Tabs/>` component is supported in domains, services, and all messages, changelogs, and custom documentation pages.
