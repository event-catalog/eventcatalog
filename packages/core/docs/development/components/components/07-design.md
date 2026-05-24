---
sidebar_position: 15
keywords:
- components
- remote schema
- fetch
- runtime
sidebar_label: Design
title: Design
description: Component for embedding EventCatalog Studio diagrams into your documentation
---

import EventCatalogPro from '@site/src/components/MDX/EventCatalogPro';
import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.56.0" />

The **Design** component is a EventCatalog component that will render a [EventCatalog Studio diagram](https://eventcatalog.studio) into your markdown page.

## Interactive controls

<AddedIn version="3.9.0" />

Design visualizations include the same interactive controls as NodeGraph components.

Switch between React Flow and Mermaid view modes, export as Mermaid diagram code, or share URLs with your team.

[Read more about interactive controls](/docs/development/components/components/nodegraph#interactive-controls)

Design visualizations also support [layout persistence](/docs/development/components/components/nodegraph#layout-persistence) in dev mode, allowing you to save custom node positions.

### Usage

**Basic Example**

```jsx /events/MyEvent/index.mdx
<Design file="event-stream-example" search={false} />
```

**With Custom Title and Height**

```jsx /events/MyEvent/index.mdx
<Design
  file="event-stream-example"
  title="Event Stream Example"
  maxHeight="600"
/>
```

### Output
When you use the `<Design />` component, it will render the diagram in your EventCatalog page.

![Example output](/img/embed-ec.png)

### Props

| Name                    | Type      | Default           | Description                                                       |
| ----------------------- | --------- | ----------------- | ----------------------------------------------------------------- |
| `file` (required)        | `string`  | (empty)           | The `.ecstudio` file to load into the diagram block. Path is resolved by EventCatalog. |
| `title` (optional)      | `string`  | "Remote Schema"   | Title to display above the diagram                                 |
| `maxHeight` (optional)  | `string`  | "400"             | Maximum height of the diagram in pixels                    |
| `search` (optional)    | `boolean`  | `false`              | Show or hide the search bar in the diagram |

### Support

The `<Design/>` component is supported in domains, services, and all messages, changelogs, and custom documentation pages.
