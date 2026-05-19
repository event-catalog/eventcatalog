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

<AddedIn version="3.39.5" />

You can show or hide items in the application sidebar by using the `sidebar` property in your `eventcatalog.config.js` file.

**By default, all items in the sidebar are shown.**

```js title="eventcatalog.config.js"
// rest of the config
sidebar: [
  {
    id: '/schemas/explorer',
    // This will hide the Schema Explorer
    visible: false,
  },
  {
    id: '/discover/events',
    // This will hide the Events item
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
| `/docs/custom` | The custom documentation page |
| `/discover/domains` | The domains page |
| `/discover/services` | The services page |
| `/discover/external-systems` | The external systems page |
| `/discover/events` | The events page |
| `/discover/commands` | The commands page |
| `/discover/queries` | The queries page |
| `/discover/flows` | The flows page |
| `/discover/containers` | The data stores page |
| `/discover/data-products` | The data products page |
| `/directory/teams` | The teams page |
| `/directory/users` | The users page |
| `/settings/general` | The settings page |
| `/studio` | The EventCatalog Studio icon |
| `/schemas/explorer` | The schema explorer page |
| `/schemas/fields` | The schema insights page (SSR only) |

### Use legacy group ids

You can also use legacy group ids to hide all items in a section at once. Setting a group id to `visible: false` hides every item that belongs to that group.

| Legacy ID | Items hidden |
| --- | --- |
| `/docs` | `/docs/custom` |
| `/discover` | All discover items (domains, services, events, commands, queries, flows, data stores, data products, external systems) |
| `/directory` | `/directory/teams` and `/directory/users` |
| `/settings` | `/settings/general` |

```js title="eventcatalog.config.js"
// rest of the config
sidebar: [
  {
    id: '/directory',
    // This will hide both Teams and Users
    visible: false,
  },
]
```