---
sidebar_position: 6
sidebar_label: Pipeline gates
title: Pipeline gates
description: Block merges automatically when governance rules trigger
---

Use the `fail` action to exit the CLI with code `1`, turning governance checks into hard gates that prevent merges when architectural rules are violated. Without `fail`, triggered rules only notify -- the CLI always exits `0`.

:::info Scale plan required
Architecture Change Detection requires an [EventCatalog Scale plan](https://eventcatalog.dev/pricing).
:::

## Add the fail action

Add `type: fail` to any rule that should block the pipeline. The `message` field is optional but recommended -- it explains to the developer exactly what needs to happen before the PR can merge.

```yaml title="governance.yaml"
rules:
  - name: payment-schema-guard
    when:
      - schema_changed
    resources:
      - consumes:PaymentService
      - message:PaymentProcessed
    actions:
      - type: console
      - type: fail
        message: "Schema change impacts payment services. Requires sign-off from @payments-team."
```

When this rule fires, the CLI prints the failure reason and exits with code `1`:

```
Governance check: comparing feat/api-change against main

Governance:

  Rule "payment-schema-guard" triggered (schema_changed):
    ! Schema changed for PaymentProcessed (event) — consumers: PaymentService

1 rule triggered.

FAILED: payment-schema-guard
  Schema change impacts payment services. Requires sign-off from @payments-team.
```

## Combine with webhooks

Pairing `type: fail` with `type: webhook` lets you block the pipeline and notify the right team at the same time. Both actions run before the process exits.

```yaml title="governance.yaml"
rules:
  - name: payment-schema-guard
    when:
      - schema_changed
    resources:
      - consumes:PaymentService
      - consumes:BillingService
    actions:
      - type: console
      - type: webhook
        url: $SLACK_ALERTS_WEBHOOK
        headers:
          Authorization: Bearer $SLACK_TOKEN
      - type: fail
        message: "Schema change impacts payment services. Requires sign-off from @payments-team."
```

## Use environment variables in messages

The `message` field supports `$ENV_VAR` interpolation, the same as webhook URLs and headers. This lets you include dynamic content such as a team handle or ticket URL stored in CI secrets.

```yaml
actions:
  - type: fail
    message: "Breaking change detected. Contact $PAYMENTS_TEAM_HANDLE for approval."
```

## Mix blocking and non-blocking rules

Rules without a `fail` action always exit `0`. You can freely mix notification-only rules with blocking rules in the same file. Only rules that include `type: fail` and actually trigger will cause a non-zero exit.

```yaml title="governance.yaml"
rules:
  # Blocks CI
  - name: consumer-removal-guard
    when:
      - consumer_removed
    resources:
      - "*"
    actions:
      - type: console
      - type: fail
        message: "Removing a consumer is a breaking change. Open a migration ticket first."

  # Notifies only, never blocks
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

## Set up GitHub Actions

No special flags are needed. The step fails automatically when the CLI exits with code `1`.

```yaml title=".github/workflows/governance.yaml"
name: EventCatalog Governance
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: ${{ github.head_ref }}
      - run: git fetch origin main
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: |
          npx @eventcatalog/cli governance check \
            --base main \
            --target ${{ github.head_ref }}
        env:
          EVENTCATALOG_SCALE_LICENSE_KEY: ${{ secrets.EVENTCATALOG_SCALE_LICENSE_KEY }}
          SLACK_ALERTS_WEBHOOK: ${{ secrets.SLACK_ALERTS_WEBHOOK }}
          SLACK_TOKEN: ${{ secrets.SLACK_TOKEN }}
```

If a triggered rule has `type: fail`, the `Run governance check` step is marked as failed and the PR cannot be merged until the check passes.

## Set up GitLab CI

```yaml title=".gitlab-ci.yml"
governance:
  stage: validate
  script:
    - npx @eventcatalog/cli governance check --base origin/main
  variables:
    EVENTCATALOG_SCALE_LICENSE_KEY: $EVENTCATALOG_SCALE_LICENSE_KEY
    SLACK_ALERTS_WEBHOOK: $SLACK_ALERTS_WEBHOOK
```

## Common gating patterns

| Scenario | Trigger | Resource filter |
|---|---|---|
| Block schema changes to payment messages | `schema_changed` | `consumes:PaymentService` or `message:PaymentProcessed` |
| Block silent consumer removal | `consumer_removed` | `"*"` |
| Block unreviewed deprecations | `message_deprecated` | `"*"` |
| Block producer removal for critical messages | `producer_removed` | `message:OrderCreated` |
