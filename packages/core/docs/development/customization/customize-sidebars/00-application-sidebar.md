---
sidebar_position: 1
keywords:
- EventCatalog application sidebar
sidebar_label: Application Sidebar
title: Application Sidebar
description: Pick and customize the application sidebar.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

The application sidebar is the sidebar that is rendered on every page in EventCatalog.

![Example](../../guides/img/custom-sidebars/application-sidebar.png)

### Show/hide items in the application sidebar

You can show or hide items in the application sidebar by using the `sidebar` property in your `eventcatalog.config.js` file.

**By default, all items is the sidebar are shown.**

```js title="eventcatalog.config.js"
// rest of the config
sidebar: [
  {
    id: '/schemas/explorer',
    // This will hide the Schema Explorer
    visible: false,
  },
]
```

Options for the `sidebar` property:

- `id`: The id of the item to hide.
- `visible`: Whether to show or hide the item.

| ID | Description |
| --- | --- |
| `/` | The home page icon |
| `/docs` | The documentation page icon |
| `/discover` | The discover page icon |
| `/directory` | The users directory page icon |
| `/studio` | The EventCatalog Studio icon |
| `/schemas/explorer` | The schema explorer page |