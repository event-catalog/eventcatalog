---
sidebar_position: 6
keywords:
- EventCatalog Schemas
sidebar_label: Schema API
title: Schema API
description: Get API (GET) access to your schemas for mocking or testing
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PlanBanner from '@site/src/components/MDX/PlanBanner';

<PlanBanner plan="Scale" />

EventCatalog provides an API to get access to your schemas and specifications.

### Message Schemas

The Message Schemas API allows you to get the schema for a specific event, query or command.

```
GET /api/schemas/events/{eventId}/{version}
GET /api/schemas/queries/{queryId}/{version}
GET /api/schemas/commands/{commandId}/{version}
```

You can also get the latest version of the schema by omitting the version parameter.

```
GET /api/schemas/events/{eventId}/latest
GET /api/schemas/queries/{queryId}/latest
GET /api/schemas/commands/{commandId}/latest
```

| Parameter | Description |
| --------- | ----------- |
| `eventId` | The id of the event |
| `queryId` | The id of the query |
| `commandId` | The id of the command |
| `version` | The version of the message or `latest` to get the latest version |

### Service Specifications

The Service Specifications API allows you to get the specification for a specific service.

```
GET /api/schemas/services/{serviceId}/{version}/{type}
```

| Parameter | Description |
| --------- | ----------- |
| `serviceId` | The id of the service |
| `version` | The version of the service |
| `type` | The type of specification, currently only `asyncapi`, `openapi` and `graphql` are supported. |
