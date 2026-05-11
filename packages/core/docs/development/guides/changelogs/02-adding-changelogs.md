---
sidebar_position: 2
keywords:
- EventCatalog changelogs
sidebar_label: Creating a changelog
title: Creating changelogs
description: Creating and managing changelogs within EventCatalog.
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Changelogs are currently supported in [domains](/docs/development/guides/domains/versioning-and-changelogs/changelog), [services](/docs/development/guides/services/versioning-and-lifecycle/changelog) and [messages](/docs/development/guides/messages/common/changelog).

To add a changelog to your resources you need to create a `changelog.mdx` file.

- /\{resource\}/\{resource name\}/changelog.mdx
  - example: /services/My Service/changelog.mdx
  - example for verion: /services/My Service/versioned/0.0.1/changelog.mdx

**Example of changelogs for resources**

<Tabs>
  <TabItem value="events" label="Events" default>
   ```md title="/events/OrderPlaced/changelog.mdx"
---
createdAt: 2024-08-01
badges:
    - content: ⭐️ JSON Schema
      backgroundColor: purple
      textColor: purple
---

### Added support for JSON Schema

InventoryAdjusted uses Avro but now also supports JSON Draft 7.

```json title="Employee JSON Draft"
// labeled-line-markers.jsx
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "title": "Employee",
  "properties": {
    "Name": {
      "type": "string"
    },
    "Age": {
      "type": "integer"
    },
    "Town": {
      "type": "string"
    }
  },
  "required": ["Name", "Age", "Town"]
}

``
```

  </TabItem>
  <TabItem value="services" label="Services">
    ```md title="/services/Inventory/changelog.mdx"
    ---
createdAt: 2024-08-01
---

### Service receives additional events

Service now receives [OrderAmended](/docs/events/OrderAmended/0.0.1) and [UpdateInventory](/docs/commands/UpdateInventory/0.0.3) events.
    ```
  </TabItem>
  <TabItem value="domains" label="Domains">
    ```md title="/domains/Order/changelog.mdx"
    ---
createdAt: 2024-08-01
---

### New service added to the Payment domain

Service now receives [OrderAmended](/docs/events/OrderAmended/0.0.1) and [UpdateInventory](/docs/commands/UpdateInventory/0.0.3) events.
    ```
  </TabItem>
</Tabs>

### Viewing your changelog

Domains, services and messages have a **Changelog** button. Clicking this button will take you to the changelog for that resource.

![Example output](./img/changelog-button.png)

Domains, services and messages all have a changelog url.

See example changelog: https://demo.eventcatalog.dev/docs/events/InventoryAdjusted/1.0.1/changelog