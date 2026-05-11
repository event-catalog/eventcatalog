---
sidebar_position: 4
sidebar_label: Webhook Payload
title: Webhook Payload
description: CloudEvents 1.0 payload format sent by governance webhook actions
---

## Payload format

Webhook actions send a POST request in [CloudEvents 1.0](https://cloudevents.io/) format. Each matched change produces a separate request.

```json
{
  "specversion": "1.0",
  "type": "eventcatalog.governance.consumer_added",
  "source": "eventcatalog/governance",
  "id": "uuid",
  "time": "2026-03-04T12:00:00.000Z",
  "datacontenttype": "application/json",
  "data": {
    "schemaVersion": 1,
    "summary": "NotificationService is now consuming the event OrderConfirmed",
    "consumer": {
      "id": "NotificationService",
      "version": "0.0.2"
    },
    "message": {
      "id": "OrderConfirmed",
      "version": "0.0.1",
      "type": "event"
    }
  }
}
```

## CloudEvents envelope

| Field | Value |
|---|---|
| `specversion` | Always `"1.0"` |
| `type` | `eventcatalog.governance.<trigger>`, one of `consumer_added`, `consumer_removed`, `producer_added`, `producer_removed`, `message_deprecated`, `schema_changed` |
| `source` | `eventcatalog/governance` |
| `id` | Unique UUID per request |
| `time` | ISO 8601 timestamp |
| `datacontenttype` | `application/json` |

## Data object

| Field | Description |
|---|---|
| `schemaVersion` | Always `1` (reserved for future format changes) |
| `status` | Only present when `--status` is passed to the CLI |
| `summary` | Human-readable description of the change |
| `consumer` or `producer` | The service involved. `consumer` for consumer triggers, `producer` for producer and `message_deprecated` triggers |
| `message` | The message involved, including its `type` (`event`, `command`, or `query`) |
| `schema` | Only present for `schema_changed`. Contains `beforeHash`, `afterHash`, `beforePath`, and `afterPath` |
| `consumers` | Only present for `schema_changed`. Array of services that consume the changed message |
| `producers` | Only present for `schema_changed`. Array of services that produce the changed message |
| `refs` | Only present for `schema_changed`. Contains `base` and `target` branch labels |

## Producer triggers

For `producer_added` and `producer_removed`, the `consumer` field is replaced with `producer`:

```json
{
  "data": {
    "schemaVersion": 1,
    "summary": "OrdersService is now producing the event OrderCreated",
    "producer": {
      "id": "OrdersService",
      "version": "1.0.0"
    },
    "message": {
      "id": "OrderCreated",
      "version": "1.0.0",
      "type": "event"
    }
  }
}
```

## Deprecation trigger

For `message_deprecated`, the payload identifies the producing service and the deprecated message. One webhook fires per producing service, so if a message has multiple producers, each producer sends a separate request.

```json
{
  "specversion": "1.0",
  "type": "eventcatalog.governance.message_deprecated",
  "source": "eventcatalog/governance",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "time": "2026-03-05T14:30:00.000Z",
  "datacontenttype": "application/json",
  "data": {
    "schemaVersion": 1,
    "summary": "OrderCreated (event) has been deprecated by OrdersService",
    "producer": {
      "id": "OrdersService",
      "version": "2.0.0",
      "owners": ["team-orders"]
    },
    "message": {
      "id": "OrderCreated",
      "version": "1.0.0",
      "type": "event"
    }
  }
}
```

The `owners` field is only present when the producing service has owners defined. The trigger fires only for newly deprecated messages: existing deprecations and un-deprecations do not fire.

## Schema changed trigger

For `schema_changed`, the payload includes a `schema` object with hashes and paths for the before and after versions, plus arrays of the affected consumer and producer services. One webhook fires per changed message.

```json
{
  "specversion": "1.0",
  "type": "eventcatalog.governance.schema_changed",
  "source": "eventcatalog/governance",
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "time": "2026-03-05T14:30:00.000Z",
  "datacontenttype": "application/json",
  "data": {
    "schemaVersion": 1,
    "summary": "Schema changed for event OrderCreated",
    "message": {
      "id": "OrderCreated",
      "version": "1.0.0",
      "type": "event"
    },
    "schema": {
      "beforeHash": "abc123",
      "afterHash": "def456",
      "beforePath": "schemas/order-created.v1.json",
      "afterPath": "schemas/order-created.v2.json"
    },
    "refs": {
      "base": "main",
      "target": "feature/update-schema"
    },
    "producers": [
      { "id": "OrdersService", "version": "1.0.0", "owners": ["team-orders"] }
    ],
    "consumers": [
      { "id": "PaymentService", "version": "1.0.0", "owners": ["team-payments"] }
    ]
  }
}
```

The `schema.beforeHash` and `schema.afterHash` are SHA-256 hashes of the schema file content. Either side can be `null` when a schema is first added or removed. The `owners` field on each service is only present when owners are defined.

## Status field

When you pass `--status` to the CLI, the value is included in the payload. This is useful for distinguishing between stages in a pull request lifecycle.

```bash
eventcatalog governance check --status proposed
```

```json
{
  "data": {
    "schemaVersion": 1,
    "status": "proposed",
    "summary": "NotificationService is now consuming the event OrderConfirmed",
    "consumer": { "id": "NotificationService", "version": "0.0.2" },
    "message": { "id": "OrderConfirmed", "version": "0.0.1", "type": "event" }
  }
}
```

## Custom headers

Headers support environment variable substitution using `$VAR_NAME` syntax.

```yaml
actions:
  - type: webhook
    url: $SLACK_WEBHOOK_URL
    headers:
      Authorization: Bearer $API_TOKEN
      X-Custom-Header: my-value
```
