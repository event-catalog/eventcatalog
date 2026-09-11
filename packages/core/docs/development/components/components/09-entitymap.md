---
sidebar_position: 9
keywords:
- components
sidebar_label: EntityMap
title: EntityMap
description: Component for EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.49.0" />

A component to visually render a domain's entity map.

The `<EntityMap/>` component is supported in domains, services, and all messages, changelogs, and custom documentation pages.

:::info
To visualize entities [you need to create entities in EventCatalog](/docs/development/guides/resources/entities/introduction) and assign them to your services or domains.
:::

## Interactive controls

<AddedIn version="3.9.0" />

Entity map visualizations include the same interactive controls as NodeGraph components.

Switch between React Flow and Mermaid view modes, export as Mermaid diagram code, or share URLs with your team.

[Read more about interactive controls](/docs/development/components/components/nodegraph#interactive-controls)

Entity maps also support [layout persistence](/docs/development/components/components/nodegraph#layout-persistence) in dev mode, allowing you to save custom node positions.

## Usage

**Example**

```jsx /domains/OrdersDomain/index.mdx
<EntityMap title="Orders Domain Entity Map" />
```

#### Output
![Example output](./img/entity-map.png)

#### Props
| Name                    | Type      | Default           | Description                                                       |
| ----------------------- | --------- | ----------------- | ----------------------------------------------------------------- |
| `id` (optional)             | `string`  | -          | The id of the domain or service entity map to render. By default the component will use the id of the current page. If you want to embed this component into custom documentation pages, you can use the `id` prop to specify the id of the domain or service to render. |
| `version` (optional)             | `string`  | -          | The version of the domain or service to render. By default the component will use the version of the current page. If you want to embed this component into custom documentation pages, you can use the `version` prop to specify the version of the domain or service to render. |
| `title` (optional)             | `string`  | -          | The title of the entity map to render. |
| `maxHeight` (optional)             | `string`  | 30           | Max height to set the nodegraph in your document. |
| `includeKey` (optional)             | `boolean`  | true           | Show or hide the legend. |
| `entities` (optional)             | `array`  | []           | Array of entities (ids or names) to filter in the map. Useful if you want to render a subset of the entities in the map. (Added in v2.51.1). [Read more about filtering](#filter-entities) |

#### Filter Entities

<AddedIn version="2.51.1" />

The `<EntityMap/>` component will render all entities by default for a given domain.

If you want to render a subset of the entities in the map, you can use the `entities` prop.

**Example**

```jsx /events/MyEvents/index.mdx
<EntityMap id="OrdersDomain" title="Orders Domain Entity Map" entities={["Order", "Customer"]} />
```

In this example, only the `Order` and `Customer` entities will be chosen to be rendered in the map.

If the `Order` or `Customer` entity references other entities, they will also be rendered in the map
