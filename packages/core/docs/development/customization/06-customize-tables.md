---
sidebar_position: 5
keywords:
- EventCatalog tables
sidebar_label: Tables
title: Customize tables
description: Customize tables in EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.63.0" />

EventCatalog allows you to customize the columns and names on the [Explore page](https://demo.eventcatalog.dev/discover/events), [Teams](https://demo.eventcatalog.dev/directory/teams) and [Users](https://demo.eventcatalog.dev/directory/users) pages.

![EventCatalog Custom Tables](./img/table-example.png)

### How to customize tables

You can customize the tables in EventCatalog by configuring them in your `eventcatalog.config.js` file.

Example of how to customize the tables for the events table page:


```js title="eventcatalog.config.js"
events: {
  tableConfiguration: {
    columns: {
      name: { visible: true, label: 'Name' },
      summary: { visible: true, label: 'Summary' },
      producers: { visible: true, label: 'Producers' },
      consumers: { visible: true, label: 'Consumers' },
      badges: { visible: true, label: 'Badges' },
      actions: { visible: true, label: 'Actions' },
    }
  },
},
```
### Configuration

List of available configuration options for the table columns:
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `visible` | boolean | true | Whether the column is visible. |
| `label` | string | - | The label to display for the column. |

<details>
  <summary>Events, Queries and Commands Table</summary>

The key property is either `events`, `queries`, `commands`.

In this example we set the **events** table configuration.

```js title="eventcatalog.config.js"
// ... other configuration ...
// change property to `events`, `queries`, `commands`
events: {
  tableConfiguration: {
    columns: {
      name: { visible: true, label: 'Name' },
      summary: { visible: true, label: 'Summary' },
      producers: { visible: true, label: 'Producers' },
      consumers: { visible: true, label: 'Consumers' },
      badges: { visible: true, label: 'Badges' },
      actions: { visible: true, label: 'Actions' },
    },
  },
}
// ... other configuration ...
```
</details>
<details>
  <summary>Services Table</summary>

```js title="eventcatalog.config.js"
// ... other configuration ...
services: {
  tableConfiguration: {
    columns: {
      name: { visible: true, label: 'Name' },
      summary: { visible: true, label: 'Summary' },
      receives: { visible: true, label: 'Receives' },
      sends: { visible: true, label: 'Sends' },
      badges: { visible: true, label: 'Badges' },
      actions: { visible: true, label: 'Actions' },
    }
  },
}
// ... other configuration ...
```
</details>
<details>
  <summary>Domains Table</summary>

```js title="eventcatalog.config.js"
// ... other configuration ...
domains: {
  tableConfiguration: {
    columns: {
      name: { visible: true, label: 'Name' },
      summary: { visible: true, label: 'Summary' },
      services: { visible: true, label: 'Owners' },
      badges: { visible: true, label: 'Badges' },
      actions: { visible: true, label: 'Actions' },
    }
  },
}
// ... other configuration ...
```
</details>
<details>
  <summary>Data Table</summary>

```js title="eventcatalog.config.js"
// ... other configuration ...
containers: {
  tableConfiguration: {
    columns: {
      name: { visible: true, label: 'Name' },
      summary: { visible: true, label: 'Summary' },
      writes: { visible: true, label: 'Writes' },
      reads: { visible: true, label: 'Reads' },
      badges: { visible: true, label: 'Badges' },
      actions: { visible: true, label: 'Actions' },
    }
  },
}
// ... other configuration ...
```
</details>
<details>
  <summary>Flows Table</summary>

```js title="eventcatalog.config.js"
// ... other configuration ...
flows: {
  tableConfiguration: {
    columns: {
      name: { visible: true, label: 'Name' },
      version: { visible: true, label: 'Version' },
      summary: { visible: true, label: 'Summary' },
      badges: { visible: true, label: 'Badges' },
      actions: { visible: true, label: 'Actions' },
    }
  },
}
// ... other configuration ...
```
</details>
<details>
  <summary>Users Table</summary>

```js title="eventcatalog.config.js"
// ... other configuration ...
users: {
  tableConfiguration: {
    columns: {
      name: { visible: true, label: 'Name' },
      ownedEvents: { visible: true, label: 'Owned Events' },
      ownedCommands: { visible: true, label: 'Owned Commands' },
      ownedQueries: { visible: true, label: 'Owned Queries' },
      ownedServices: { visible: true, label: 'Owned Services' },
      teams: { visible: true, label: 'Teams' },
      actions: { visible: true, label: 'Actions' },
    }
  },
}
// ... other configuration ...
```
</details>
<details>
  <summary>Teams Table</summary>

```js title="eventcatalog.config.js"
// ... other configuration ...
teams: {
  tableConfiguration: {
    columns: {
      name: { visible: true, label: 'Name' },]
      ownedEvents: { visible: true, label: 'Owned Events' },
      ownedCommands: { visible: true, label: 'Owned Commands' },
      ownedQueries: { visible: true, label: 'Owned Queries' },
      ownedServices: { visible: true, label: 'Owned Services' },
      actions: { visible: true, label: 'Actions' },
    }
  },
}
// ... other configuration ...
```
</details>



You can read the `eventcatalog.config.js` API reference for [more information on the table configuration](/docs/api/config#domains).
