---
sidebar_position: 15
keywords:
- components
- remote schema
- fetch
- runtime
sidebar_label: MermaidFileLoader
title: MermaidFileLoader
description: Component for embedding EventCatalog Studio diagrams into your documentation
---
import AddedIn from '@site/src/components/MDX/AddedIn';

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<AddedIn version="2.56.4" />

The **MermaidFileLoader** component is a EventCatalog component that will render a [Mermaid](https://mermaid.js.org/) file into your markdown page.

**Basic Example**

<Tabs>
  <TabItem value="Markdown file" label="Markdown file" default>
    
```jsx /events/MyEvent/index.mdx
<MermaidFileLoader file="mermaid.mmd" />
```
  </TabItem>
  <TabItem value="Mermaid file (.mmd or .mermaid)" label="Mermaid file (.mmd or .mermaid)">
    ```
  sequenceDiagram
      participant Customer
      participant OrdersService
      participant InventoryService
      participant NotificationService

      Customer->>OrdersService: Place Order
      OrdersService->>InventoryService: Check Inventory
      InventoryService-->>OrdersService: Inventory Available
      OrdersService->>InventoryService: Reserve Inventory
      OrdersService->>NotificationService: Send Order Confirmation
      NotificationService-->>Customer: Order Confirmation
      OrdersService->>Customer: Order Placed Successfully
      OrdersService->>InventoryService: Update Inventory
    ```
  </TabItem>
</Tabs>

### Output
When you use the `<MermaidFileLoader />` component, it will render the diagram in your EventCatalog page.

![Example output](./img/mermaid.png)

### Props

| Name                    | Type      | Default           | Description                                                       |
| ----------------------- | --------- | ----------------- | ----------------------------------------------------------------- |
| `file` (required)        | `string`  | (empty)           | The `.mmd` or `.mermaid` file to load into the diagram block. Path is resolved by EventCatalog. |

### Support

The `<MermaidFileLoader/>` component is supported in domains, services, and all messages, changelogs, and custom documentation pages.
