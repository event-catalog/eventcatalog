---
sidebar_position: 6
keywords:
  - components
sidebar_label: Tiles
title: Tiles
description: Render tiles into EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.7.12"/>

Renders Tiles in EventCatalog, can be great for internal and external links.

Tile icons are from [hero icons](https://heroicons.com/), you can find a [list of them here](https://unpkg.com/browse/@heroicons/react@2.1.5/24/outline/).

**Example**

```jsx /services/MyService/index.mdx
<Tiles columns={2}>
  <Tile icon="DocumentIcon" href="/docs" title="View the docs" description="Dive deeper and view our docs" />
  <Tile icon="DocumentIcon" href="/visualiser" title="View the visualiser" description="Explore your architecture" />
  <Tile icon="UserGroupIcon" href="https://eventcatalog.dev" openWindow="true" title="Contact EventCatalog" description="Any questions? Visit our website!" />
  <Tile icon="BoltIcon" href={`/visualiser/services/${frontmatter.id}/${frontmatter.version}`} title={`Receives ${frontmatter.receives.length} messages`} description="This service receives messages from downstream consumers" />
</Tiles>
```

### Output
![Example output](./img/tiles.png)

See example in the [demo EventCatalog application](https://demo.eventcatalog.dev/docs/services/InventoryService/0.0.2).

### Props (`<Tiles>`)

| Name               | Type     | Default | Description                             |
| ------------------ | -------- | ------- | --------------------------------------- |
| `title` (optional) | `string` | (empty) | Title that gets renders above the tiles |
| `columns` (optional) | `number` | 2 | Number of columns to render the tiles in |
### Props (`<Tile>`)

| Name                     | Type      | Default | Description                                                                                                                                                |
| ------------------------ | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title` (optional)       | `string`  | (empty) | Title for the tile                                                                                                                                         |
| `description` (optional) | `string`  | (empty) | Description for the tile                                                                                                                                   |
| `icon` (optional)        | `string`  | (empty) | Icon to show in the tile. Iconss are [HeroIcons](https://heroicons.com/). [Find a list here](https://unpkg.com/browse/@heroicons/react@2.1.5/24/outline/). |
| `iconColor` (optional)   | `string`  | `text-purple-500` | The color of the icon, using tailwind classes.                                                                                |
| `href` (optional)        | `string`  | (empty) | URL for the tile                                                                                                                                           |
| `openWindow` (optional)  | `boolean` | (empty) | Open the URL in a new window                                                                                                                               |

### Support

The `<Tiles/>` component is supported in domains, services, and all messages, changelogs, and custom documentation pages.
