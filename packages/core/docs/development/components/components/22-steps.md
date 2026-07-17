---
sidebar_position: 22
keywords:
  - components
sidebar_label: Steps
title: Steps
description: Render steps into EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.7.14"/>

The Steps component is a powerful tool for creating structured, sequential guides in EventCatalog. It's ideal for presenting step-by-step instructions, tutorials, or workflows, particularly when explaining processes, API integrations, or code implementations.

### Key Features:

- Automatic Numbering: Steps are automatically numbered, providing clear sequence and structure.
- Flexible Content: Supports various content types including text, code snippets, and embedded components.

### Use Cases:

- Walking users through setup procedures
- Explaining complex workflows
- Presenting API integration steps
- Showcasing code examples with explanations

**Example**

```jsx /services/MyService/index.mdx
<Steps title="How to connect to Inventory Service">
  <Step title="Obtain API credentials">
    Request API credentials from the Inventory Service team.
  </Step>
  <Step title="Install the SDK">
    Run the following command in your project directory:
    ```bash
      npm install inventory-service-sdk
    ```_
  </Step>
  <Step title="Initialize the client">
  Use the following code to initialize the Inventory Service client:
  ```js
    const InventoryService = require('inventory-service-sdk');
    const client = new InventoryService.Client({
      clientId: 'YOUR_CLIENT_ID',
      clientSecret: 'YOUR_CLIENT_SECRET',
      apiUrl: 'https://api.inventoryservice.com/v1'
    });
  ```_
  </Step>
  <Step title="Make API calls">
  
  You can now use the client to make API calls. For example, to get all products:
  ```js
  client.getProducts()
    .then(products => console.log(products))
    .catch(error => console.error(error));
  ```_
  </Step>
</Steps>
```

### Output
![Example output](./img/steps.png)

See example in the [demo EventCatalog application](https://demo.eventcatalog.dev/docs/services/InventoryService/0.0.2).

### Props (`<Steps>`)

| Name               | Type     | Default | Description                             |
| ------------------ | -------- | ------- | --------------------------------------- |
| `title` (optional) | `string` | (empty) | Title that gets renders above the steps |

### Props (`<Step>`)

| Name                     | Type      | Default | Description                                                                                                                                                |
| ------------------------ | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title` (required)       | `string`  | (empty) | Title for the step                                                                                                                                         |

### Support

The `<Steps/>` component is supported in domains, services, and all messages, changelogs, and custom documentation pages.
