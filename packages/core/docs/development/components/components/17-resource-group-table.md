---
sidebar_position: 2
keywords:
- components
sidebar_label: ResourceGroupTable
title: ResourceGroupTable
description: Component for displaying EventCatalog grouped resources in EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.32.0" />

The `<ResourceGroupTable/>` component renders a table of resources for your page in EventCtalog.

The component renders a paginated table of (messages, services, domains, flows, channels), with the ability to filter by resource type, and text search.

### Why use ResourceGroupTable?

Sometimes in your catalog you may want to link related resources together or group them in particular ways that EventCatalog does not naturally support.

Examples:

- List a custom list of messages in a domain page
- Create a "Related Resources" section on your docs for your documentation readers
- Create a custom list of resources in your page and let people search them easily.

### Usage

The `<ResourceGroupTable/>` component requires **frontmatter** property called **resourceGroups** defined in your resource, and then the component itself.

1. Adding `resourceGroup` property to your resource
```md title="example /domains/Orders/index.mdx"
---
id: Orders
name: Orders
version: 0.0.3
owners:
  - dboyne
  - full-stack
# Here we define the resourceGroups, in this example we create a group called core resources
# We create a list called `related-resources` and we group these services.
# Remember you can define any group of information you want, and link to any catalog resource
resourceGroups:
  - id: related-resources
    title: Core resources
    items:
      - id: InventoryService
        type: service
      - id: OrdersService
        type: service
      - id: NotificationService
        type: service
      - id: ShippingService
        type: service
---
```


**Basic Example**

```md /domains/MyDomain/index.mdx
---
#domain frontmatter
---

<ResourceGroupTable id="related-resources" limit={4} showOwners={true} title="Core resources for the Orders domain" description="Resources that are related to the Orders domain, you may find them useful" />
```
### Output
![Example output](./img/resource-group-table.png)

You can see the demo of this in the [Orders domain page](https://demo.eventcatalog.dev/domains/Orders/0.0.3).

### Props
| Name                    | Type      | Default           | Description                                                       |
| ----------------------- | --------- | ----------------- | ----------------------------------------------------------------- |
| `id`             | `string`  | none           | Id of the resource group to render. |
| `title`             | `string`  | 'Related Resources'           | The title shown above the table. |
| `subtitle`             | `string`  | 'Resources'           | The title shown inside the table. |
| `description`             | `string`  | 'Resources that are related to the current resource.'           | The description of the table. |
| `limit`             | `number`  | 10           | The number of resources to render in the table. Results are paginated. |
| `showOwners`             | `boolean`  | false           | Whether to show the owners of the resources in the table. |

### Support

The `<ResourceGroupTable/>` component is supported on all EventCatalog pages.
