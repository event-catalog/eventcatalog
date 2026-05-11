---
id: cli-messages
title: Messages
sidebar_label: Messages
sidebar_position: 15
---

# Messages CLI Commands

Manage messages in your EventCatalog from the command line.

## getProducersAndConsumersForMessage

Returns the producers and consumers (services) for a given message

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the message |
| version | string | No | Specific version |



---

## getConsumersOfSchema

Returns services that consume a given schema

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| schemaPath | string | Yes | Path to the schema file |



---

## getProducersOfSchema

Returns services that produce a given schema

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| schemaPath | string | Yes | Path to the schema file |



---

## getOwnersForResource

Returns the owners (users/teams) for a given resource

**Arguments:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | The ID of the resource |
| version | string | No | Specific version |

**Examples:**

```bash
# Get owners for a resource
npx @eventcatalog/cli getOwnersForResource "OrderService"
```

---
