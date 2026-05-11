---
sidebar_position: 2
sidebar_label: Configuration
title: Configuration
description: Configure governance rules with triggers, resource filters, and actions
---

## Create a config file

Add a `governance.yaml` file to the root of your catalog directory. Each rule has a name, a list of triggers, a resource filter, and one or more actions.

```yaml title="governance.yaml"
rules:
  # Name of your rule
  - name: notify-consumer-changes
    # List of triggers
    when:
      - consumer_added
      - consumer_removed
    # Configure which resources to watch
    # * is everything
    resources:
      - "*"
    # List of actions to perform
    actions:
      # Print to the console
      - type: console
      # Send a webhook to a Slack or PagerDuty webhook
      - type: webhook
        url: $SLACK_WEBHOOK_URL
        headers:
          Authorization: Bearer $API_TOKEN
```

## Triggers

The `when` field lists the events that activate a rule. Relationship triggers compare the target state against the base branch. The `message_deprecated` and `schema_changed` triggers inspect the target branch directly.

| Trigger | Description |
|---|---|
| `consumer_added` | A service starts receiving a message |
| `consumer_removed` | A service stops receiving a message |
| `producer_added` | A service starts sending a message |
| `producer_removed` | A service stops sending a message |
| `message_deprecated` | A producing service marks a message as deprecated |
| `schema_changed` | A message schema file is added, modified, or replaced |

A single rule can listen to multiple triggers:

```yaml
when:
  - consumer_added
  - consumer_removed
```

## Resource filters

The `resources` field controls which changes are checked against the rule. Each entry uses a prefix to specify what to match.

| Prefix | Example | Matches |
|---|---|---|
| `"*"` | `"*"` | All changes across the catalog |
| `"message:<id>"` | `"message:OrderCreated"` | Changes involving a specific message |
| `"service:<id>"` | `"service:NotificationService"` | Changes where the named service is the consumer or producer |
| `"produces:<service>"` | `"produces:OrdersService"` | Changes involving any message that the named service sends |
| `"consumes:<service>"` | `"consumes:PaymentService"` | Changes involving any message that the named service receives. For `message_deprecated` and `schema_changed`, matches messages consumed by the named service |

You can combine multiple filters in one rule. A change matches if it matches **any** entry:

```yaml
resources:
  - message:OrderCreated
  - message:OrderConfirmed
  - service:NotificationService
```

## Actions

Each rule can trigger one or more actions when its conditions are met.

### Console

Prints a summary of matched changes to the terminal. No additional configuration required.

```yaml
actions:
  - type: console
```

### Webhook

Sends a POST request in [CloudEvents 1.0](https://cloudevents.io/) format to the specified URL. Custom headers are supported.

_You can use [Webhook Sites](https://webhook.site) to test your webhook URLs. Don't share any sensitive information in the payload._

```yaml
actions:
  - type: webhook
    url: $SLACK_WEBHOOK_URL
    headers:
      Authorization: Bearer $API_TOKEN
```

See [Webhook Payload](/docs/development/governance/architecture-change-detection/webhooks) for the full payload format.

### Fail

Exits the CLI with code `1`, failing the CI/CD step and blocking the pipeline. An optional `message` field provides a human-readable reason shown in the terminal output.

```yaml
actions:
  - type: fail
    message: "Schema change impacts payment services. Requires sign-off from @payments-team."
```

The `message` field supports `$ENV_VAR` interpolation. A rule can include multiple `fail` actions; all messages are collected and printed together before the process exits.

If no triggered rule has a `fail` action, the CLI exits with code `0` regardless of how many rules fired. This means adding `type: fail` to specific rules is a non-breaking, opt-in change.

See [Pipeline gates](/docs/development/governance/architecture-change-detection/pipeline-gates) for full examples of blocking CI/CD with governance rules.

## Environment variables

Webhook URLs and header values can reference environment variables using the `$VAR_NAME` syntax. The CLI loads your catalog's `.env` file automatically, so you can keep secrets out of `governance.yaml`.

```yaml
actions:
  - type: webhook
    url: $SLACK_WEBHOOK_URL
    headers:
      Authorization: Bearer $API_TOKEN
```

If a referenced variable is not set at runtime, the command exits with an error.
