---
sidebar_position: 5
sidebar_label: CLI & CI/CD
title: CLI & CI/CD
description: Run governance checks locally and in your CI/CD pipeline
---

## Run the check

Run the check from inside your catalog directory. By default it compares the current working directory against the `main` branch.

```bash
eventcatalog governance check
```

#### Testing locally

To test locally, make changes to your catalog locally and then run the governance check command.

```sh
eventcatalog governance check --target main
```

This will compare the current working directory against the specified branch.

## CLI options

| Option | Description | Default |
|---|---|---|
| `--base <branch>` | Base branch to compare against | `main` |
| `--target <branch>` | Target branch to compare (instead of working directory) | working directory |
| `--format json` | Output results as JSON | text |
| `--status <label>` | Status label included in webhook payloads (e.g. `proposed`, `approved`) | none |

### Compare two branches

```bash
eventcatalog governance check --base main --target feature/new-consumers
```

### Output JSON

```bash
eventcatalog governance check --format json
```

### Include a status label

The `--status` flag adds a `status` field to webhook payloads, useful when running governance checks at different stages of a pull request lifecycle.

```bash
eventcatalog governance check --status proposed
```

## GitHub Actions

### Proposed changes

When you want to notify your teams of incoming changes (not merged yet), you can use the `--status proposed` flag to mark the changes as proposed.

This example workflow will notify your teams of incoming changes (not merged yet). The status `proposed` will be included in the webhook payload.

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
      # Fetch the base branch (e.g. main or whatever you want to compare against)
      - run: git fetch origin main
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: |
          npx @eventcatalog/cli governance check \
            --base main \
            --target ${{ github.head_ref }} \
            --status proposed
        env:
          EVENTCATALOG_SCALE_LICENSE_KEY: ${{ secrets.EVENTCATALOG_SCALE_LICENSE_KEY }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### Approved changes

When a pull request is merged to the base branch, you can run the check again with `--status approved` to notify teams that the change is confirmed.

This example workflow will notify your teams that the change is confirmed. The status `approved` will be included in the webhook payload.

```yaml title=".github/workflows/governance.yaml"
name: EventCatalog Governance
on: merge

jobs:
  governance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          ref: ${{ github.base_ref }} 
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: |
          npx @eventcatalog/cli governance check \
            --base main \
            --target ${{ github.base_ref }} \
            --status approved
        env:
          EVENTCATALOG_SCALE_LICENSE_KEY: ${{ secrets.EVENTCATALOG_SCALE_LICENSE_KEY }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```