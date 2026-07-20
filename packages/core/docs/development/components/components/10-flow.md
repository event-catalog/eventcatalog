---
sidebar_position: 10
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
<Flow id="CancelSubscription" version="latest" legend={false} />
```

### Output
![Example output](./img/flows.png)

### Props

<AddedIn version="3.36.3" />

| Name                    | Type      | Default           | Description                                                       |
| ----------------------- | --------- | ----------------- | ----------------------------------------------------------------- |
| `id` (required)                 | `string`  | (empty)           | Flow id to render in your page                               |
| `version` (optional)             | `string`  | `"latest"`           | Version of the flow to render. Supports exact version and semver versions (e.g 1.0.x, ^1.3.5, latest)|
| `legend` (optional)             | `boolean`  | `true`           | Show or hide the diagram key. Accepts `true`/`false` or `"true"`/`"false"`. `includeKey` is still accepted as an alias. |
| `search` (optional)             | `boolean`  | `false`           | Show or hide the search bar in the flow. Accepts `true`/`false` or `"true"`/`"false"`. |
| `walkthrough` (optional)             | `boolean`  | `false`           | Show or hide the step walkthrough controls. Accepts `true`/`false` or `"true"`/`"false"`. |
| `mode` (optional)             | `string` ("simple" or "full")  | `"simple"`           | `simple` renders the flow in a simplified view without descriptions. `full` renders descriptions and other information.|

:::tip Multiple embeds per page
You can embed multiple `<Flow />` components on the same page and each one renders independently.
:::


## Interactive controls

<AddedIn version="3.9.0" />

Flow visualizations include the same interactive controls as NodeGraph components.

Switch between React Flow and Mermaid view modes, export as Mermaid diagram code, or share URLs with your team.

[Read more about interactive controls](/docs/development/components/components/nodegraph#interactive-controls)

Flow visualizations also support [layout persistence](/docs/development/components/components/nodegraph#layout-persistence) in dev mode, allowing you to save custom node positions.

### Support

The `<Flow/>` component is supported in domains, services, and all messages, changelogs, and custom documentation pages.
