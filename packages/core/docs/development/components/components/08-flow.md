---
sidebar_position: 6
keywords:
- components
sidebar_label: Flow
title: Flow
description: Render a Flow in any EventCatalog page
---

import AddedIn from '@site/src/components/MDX/AddedIn';

Embed flows into your pages.

**Example**

```jsx /domains/MyDomain/index.mdx
<Flow id="CancelSubscription" version="latest" includeKey={false} />
```

### Output
![Example output](./img/flows.png)

### Props
| Name                    | Type      | Default           | Description                                                       |
| ----------------------- | --------- | ----------------- | ----------------------------------------------------------------- |
| `id` (required)                 | `string`  | (empty)           | Flow id to render in your page                               |
| `version` (optional)             | `string`  | "latest"           | Version of the flow to render. Supports exact version and semver versions (e.g 1.0.x, ^1.3.5, latest)|
| `includeKey` (optional)             | `boolean`  | true           | Renders the diagram key on the UI |
| `search` (optional)             | `boolean`  | true           | Show or hide the search bar in the flow _(Added in v2.50.3)_ |
| `mode` (optional)             | `string` ("simple" or "full")  | "simple"           | `simple` will render the flow in a simplfied view not rendering descriptions. Full will render the flow in a full view, rendering descriptions and other information _(Added in v2.50.3)_|

## Interactive controls

<AddedIn version="3.9.0" />

Flow visualizations include the same interactive controls as NodeGraph components.

Switch between React Flow and Mermaid view modes, export as Mermaid diagram code, or share URLs with your team.

[Read more about interactive controls](/docs/development/components/components/nodegraph#interactive-controls)

Flow visualizations also support [layout persistence](/docs/development/components/components/nodegraph#layout-persistence) in dev mode, allowing you to save custom node positions.

### Support

The `<Flow/>` component is supported in domains, services, and all messages, changelogs, and custom documentation pages.
