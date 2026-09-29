---
sidebar_position: 3
keywords:
- EventCatalog field usage
- field lineage
- schema field tracking
sidebar_label: Consumer Field Usage
title: Consumer Field Usage
description: Track which services depend on specific message fields.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

Field Usage lets consumers declare which specific fields of a message they depend on. When fields are declared, EventCatalog generates a **Field Usage** page for that message showing a cross-service view of field dependencies.

This gives producers visibility into downstream impact before changing or removing a field.

![Field Usage](../img/field-usage.png)

## Declare fields in services

To declare field dependencies, add a `fields` array to any entry in your service's `receives` frontmatter.

```md title="/services/ShippingService/index.mdx"
---
id: ShippingService
version: 1.0.0
receives:
  - id: PaymentProcessed
    version: 1.0.0
    fields:
      - orderId
      - amount
      - currency
      - shippingAddress.country
      - lineItems[].sku
    from:
      - id: payments.events
---
```

The `fields` array is a list of field paths as strings. Only include the fields your service actually reads -- you do not need to list every field in the message.

Paths can be top-level property names (`orderId`) or nested paths. For JSON Schema and Avro, nested objects use dotted paths (`shippingAddress.country`) and array items use `[]` (`lineItems[].sku`). EventCatalog matches those paths against the schema, so the Field Usage page shows the nested field's type and description.

Declaring a parent object such as `shippingAddress` records a dependency on that object. It does not record a dependency on each nested property. List the nested paths you actually read when you need a precise blast radius.

Protobuf schemas are matched by field name. The extractor does not expand nested protobuf messages into dotted paths.

## Declare fields in domains

Domains support the same `fields` property on their `receives` pointers.

```md title="/domains/Billing/index.mdx"
---
id: Billing
version: 1.0.0
receives:
  - id: PaymentProcessed
    version: 1.0.0
    fields:
      - orderId
      - amount
---
```

## View the Field Usage page

When a message has a `schemaPath` set and at least one service or domain declares `fields` for that message, a **Field Usage** link appears in the message sidebar under "API & Contracts".

Navigate to any message page and click **Field Usage** in the sidebar, or go directly to:

```
http://localhost:3000/docs/{type}/{id}/{version}/field-lineage
```

The page shows a table with the following columns:

| Column | Description |
|---|---|
| Field | The field path from the schema. Nested objects use dotted paths (`shippingAddress.country`). Array items use `[]` (`lineItems[].sku`) |
| Type | The data type (extracted from the schema) |
| Description | The field description (extracted from the schema) |
| Consumers | Services or domains that declared a dependency on this field |

All fields from the schema are listed, including nested paths -- not only the ones with declared consumers. This gives you a complete picture and makes it easy to spot unused fields.

Use the **Consumed only** filter button to narrow the list down to fields that have at least one consumer.

## Understand the "Fields not found in schema" section

If a service declares a field path that does not exist in the message schema, it appears in a separate **Fields not found in schema** warning section at the bottom of the page. Nested paths are matched exactly, so `shippingAddress.country` is found when that property exists, and a typo such as `shippingAddress.countrty` is reported here.

This section helps you catch:

- Typos in field names declared by consumers
- Fields that were removed from the schema but are still referenced by consumers
- Outdated documentation that has drifted from the actual schema

Resolving these mismatches keeps your documentation accurate and prevents consumers from unknowingly depending on fields that no longer exist.

## Supported schema formats

Field metadata (type and description) is automatically extracted from the message schema. The following formats are supported:

- JSON Schema
- Avro
- Protobuf

If your schema is in a different format, the Field Usage page will still list declared consumers but will not show type or description information.

## Use the SDK

The `fields` property is also available when using the EventCatalog SDK to programmatically add messages to services or domains.

```typescript
import { addEventToService } from '@eventcatalog/sdk';

await addEventToService('ShippingService', 'receives', {
  id: 'PaymentProcessed',
  version: '1.0.0',
  fields: ['orderId', 'amount', 'currency'],
});
```

The same `fields` option is available on `addCommandToService`, `addQueryToService`, `addEventToDomain`, `addCommandToDomain`, and `addQueryToDomain`.
