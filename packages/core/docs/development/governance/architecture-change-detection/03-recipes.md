---
sidebar_position: 3
sidebar_label: Recipes
title: Recipes
description: Common governance configurations you can copy and adapt
---

## Alert when anyone consumes a message your service produces

Use the `produces:` prefix to scope a rule to all messages sent by a given service. This is the recommended pattern for service owners who want visibility into downstream adoption.

```yaml title="governance.yaml"
rules:
  - name: orders-service-consumer-changes
    when:
      - consumer_added
      - consumer_removed
    resources:
      - produces:OrdersService
    actions:
      - type: webhook
        url: $SLACK_WEBHOOK_URL
        headers:
          Authorization: Bearer $API_TOKEN
```

## Alert when a producer stops producing a message your service depends on

Use `consumes:` to watch all messages a service receives, then trigger on `producer_removed`. This catches upstream breaking changes before they affect your service.

```yaml title="governance.yaml"
rules:
  - name: payment-service-upstream-removed
    when:
      - producer_removed
    resources:
      - consumes:PaymentService
    actions:
      - type: console
      - type: webhook
        url: $PAGERDUTY_WEBHOOK_URL
```

A collection of examples of common governance configurations you can copy and adapt.

## Alert when a message gets a new consumer

Useful when you own a message and want to know when other teams start depending on it.

```yaml title="governance.yaml"
rules:
  - name: new-consumer-for-payment-processed
    when:
      - consumer_added
    resources:
      - message:PaymentProcessed
    actions:
      - type: webhook
        url: $SLACK_WEBHOOK_URL
```

## Alert when a message gets a new producer

Useful for messages that should only ever have one authoritative producer.

```yaml title="governance.yaml"
rules:
  - name: new-producer-for-order-created
    when:
      - producer_added
    resources:
      - message:OrderCreated
    actions:
      - type: console
      - type: webhook
        url: $SLACK_WEBHOOK_URL
```



## Track all changes across the catalog

The `"*"` wildcard matches every consumer and producer change. Useful for audit logs or a central ops channel.

```yaml title="governance.yaml"
rules:
  - name: catalog-wide-relationship-changes
    when:
      - consumer_added
      - consumer_removed
      - producer_added
      - producer_removed
    resources:
      - "*"
    actions:
      - type: webhook
        url: $AUDIT_WEBHOOK_URL
```

## Monitor all changes for a specific service

Use the `service:` prefix to watch any consuming or producing change that involves a named service, regardless of which message is affected.

```yaml title="governance.yaml"
rules:
  - name: notification-service-changes
    when:
      - consumer_added
      - consumer_removed
      - producer_added
      - producer_removed
    resources:
      - service:NotificationService
    actions:
      - type: console
      - type: webhook
        url: $SLACK_WEBHOOK_URL
```

## Get notified when a message your service consumes is deprecated

Use `consumes:` with `message_deprecated` to alert your team when an upstream producer deprecates a message you depend on. This is the most useful deprecation pattern for consumer teams.

```yaml title="governance.yaml"
rules:
  - name: alert-deprecated-messages
    when:
      - message_deprecated
    resources:
      - "consumes:InventoryService"
    actions:
      - type: console
      - type: webhook
        url: $SLACK_WEBHOOK_URL
```

## Watch a specific message for deprecation

Use `message:` to monitor a single message across any of its producers.

```yaml title="governance.yaml"
rules:
  - name: watch-order-placed-deprecation
    when:
      - message_deprecated
    resources:
      - "message:OrderPlaced"
    actions:
      - type: webhook
        url: $TEAM_WEBHOOK_URL
```

## Track all deprecations across the catalog

The `"*"` wildcard catches every deprecation in the catalog. Useful for a central ops channel or audit log.

```yaml title="governance.yaml"
rules:
  - name: catalog-wide-deprecation-alerts
    when:
      - message_deprecated
    resources:
      - "*"
    actions:
      - type: console
      - type: webhook
        url: $AUDIT_WEBHOOK_URL
```

## Alert when a message schema changes

Use `schema_changed` to detect when the schema file for any message is added, modified, or replaced. This is useful for catching breaking changes before they propagate to consumers.

```yaml title="governance.yaml"
rules:
  - name: schema-change-alerts
    when:
      - schema_changed
    resources:
      - "*"
    actions:
      - type: console
      - type: webhook
        url: $SLACK_WEBHOOK_URL
```

## Alert when a schema changes for messages your service consumes

Use `consumes:` with `schema_changed` to scope alerts to only the messages your service depends on.

```yaml title="governance.yaml"
rules:
  - name: payment-service-schema-changes
    when:
      - schema_changed
    resources:
      - consumes:PaymentService
    actions:
      - type: webhook
        url: $PAGERDUTY_WEBHOOK_URL
```

## Watch a specific message for schema changes

Use `message:` to monitor schema changes for a single message across any of its producers.

```yaml title="governance.yaml"
rules:
  - name: order-created-schema-watch
    when:
      - schema_changed
    resources:
      - message:OrderCreated
    actions:
      - type: console
      - type: webhook
        url: $TEAM_WEBHOOK_URL
```

## Block CI when a payment-critical schema changes

Combine `type: fail` with `schema_changed` and service-scoped resource filters to require sign-off before a schema change can merge.

```yaml title="governance.yaml"
rules:
  - name: payment-schema-guard
    when:
      - schema_changed
    resources:
      - consumes:PaymentService
      - consumes:BillingService
      - message:PaymentProcessed
      - message:OrderCreated
    actions:
      - type: console
      - type: webhook
        url: $SLACK_ALERTS_WEBHOOK
        headers:
          Authorization: Bearer $SLACK_TOKEN
      - type: fail
        message: "Schema change impacts payment services. Requires sign-off from @payments-team."
```

## Block CI when a consumer is silently removed

Use `consumer_removed` with `type: fail` to ensure consumer removals are never merged without a migration ticket.

```yaml title="governance.yaml"
rules:
  - name: consumer-removal-guard
    when:
      - consumer_removed
    resources:
      - "*"
    actions:
      - type: console
      - type: fail
        message: "Removing a consumer is a breaking change. Open a migration ticket first."
```

## Block CI on deprecation without a replacement

Pair `message_deprecated` with `type: fail` to enforce that deprecations are reviewed before merging.

```yaml title="governance.yaml"
rules:
  - name: deprecation-review-gate
    when:
      - message_deprecated
    resources:
      - "*"
    actions:
      - type: console
      - type: fail
        message: "Deprecations require a migration guide before merging. See CONTRIBUTING.md."
```

## Notify on some changes, block on others

Rules without `type: fail` always exit `0`, so you can mix notification-only rules with blocking rules in the same file.

```yaml title="governance.yaml"
rules:
  # Blocks CI — schema changes to payment-critical messages
  - name: payment-schema-guard
    when:
      - schema_changed
    resources:
      - consumes:PaymentService
    actions:
      - type: console
      - type: fail
        message: "Schema change impacts payment services. Requires sign-off from @payments-team."

  # Notifies only — new consumers are welcome but the team wants visibility
  - name: notify-new-consumers
    when:
      - consumer_added
    resources:
      - "*"
    actions:
      - type: console
      - type: webhook
        url: $SLACK_NOTIFICATIONS_WEBHOOK
```

## Future changes

We are working on adding new change detection features to EventCatalog, if you have any ideas or feedback please let us know on [Discord](https://eventcatalog.dev/discord) or raise an issue on [GitHub](https://github.com/event-catalog/eventcatalog/issues).