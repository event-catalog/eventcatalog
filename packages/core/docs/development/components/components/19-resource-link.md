---
sidebar_position: 19
keywords:
- components
sidebar_label: ResourceLink
title: ResourceLink
description: Create links in your documentation to resources in EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.32.3" />

:::tip Prefer wiki-style syntax
For most use cases, we recommend using the newer [resource references](/docs/development/components/resource-references) syntax instead:

```md
[[service|InventoryService]]
```

This provides interactive tooltips and a more natural writing experience. Use `<ResourceLink/>` only when you need custom link text or explicit component control.
:::

The `<ResourceLink/>` component renders a link to a resource in EventCatalog.

**Basic Example**

```jsx /domains/MyDomain/index.mdx
<ResourceLink id="InventoryService" type="service" />

<ResourceLink id="InventoryService" type="service" version="1.0.0" />

<ResourceLink id="InventoryService" type="service">This is a custom link</ResourceLink>
```

### Props
| Name                    | Type      | Default           | Required | Description                                                       |
| ----------------------- | --------- | ----------------- | -------- | ----------------------------------------------------------------- |
| `id`             | `string`  | none           | Yes      | Id of the resource group to render. |
| `type`             | `string`  | none           | Yes      | The type of resource to render (service, event, query, command, channel, flow, domain, user, team) |
| `version`             | `string`  | none           | Optional. The version of the resource to render, by default the latest version is used. | Version of the resource to link to.

### Recommended alternative

<AddedIn version="3.6.1" />

For most documentation, prefer the wiki-style syntax which provides interactive tooltips:

```md
The [[service|InventoryService]] manages inventory.
```

See [Resource references](/docs/development/components/resource-references) for full documentation.

### Support

The `<ResourceLink/>` component is supported on all EventCatalog pages.
