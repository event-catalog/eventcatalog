---
sidebar_position: 2
keywords:
  - Code-to-Docs
  - EventCatalog Agents
  - GitHub Actions
  - GitHub App
sidebar_label: Setup with GitHub
title: Set up Code-to-Docs with GitHub
description: Run the Code-to-Docs workflow in GitHub Actions, so merged pull requests update your EventCatalog through a catalog pull request.
slug: /development/agents/set-up-code-to-docs/github
---

Run Code-to-Docs in **GitHub Actions** with the `event-catalog/agents` action. New to Code-to-Docs? Read the [introduction](/docs/development/agents/set-up-code-to-docs) first.

## Before you start

You need:

- An EventCatalog in a GitHub repository (the **catalog repository**), with the catalog at the root of the repository.
- A GitHub repository with code to document (the **source repository**).
- An API key for an AI model provider.

## Setup

In your source repository, add two secrets under **Settings → Secrets and variables → Actions**:

- `ANTHROPIC_API_KEY`, or the key for [your model provider](/docs/development/agents/set-up-code-to-docs#models).
- `EVENTCATALOG_TOKEN`, a GitHub token that can read your catalog repository, push branches to it and open pull requests. Or [use a GitHub App](#use-a-github-app).

Then add the workflow:

```yaml title=".github/workflows/eventcatalog.yml"
on:
  pull_request:
    types: [closed]

jobs:
  code-to-docs:
    # Only once the pull request is merged.
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v6
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          fetch-depth: 0
      - uses: event-catalog/agents@v2
        env:
          # The key for your model's provider. This one is for the default model.
          # Using another provider? Swap this variable and set `model` below.
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        with:
          # The agent workflow to run.
          agent: code-to-docs
          # Your catalog repository, in owner/repo format.
          catalog-repo: your-org/your-catalog
          # A token that can read your catalog, push branches and open pull requests.
          catalog-token: ${{ secrets.EVENTCATALOG_TOKEN }}
          # Optional: the model to use. Defaults to anthropic/claude-sonnet-4-6.
          # model: openai/gpt-5.1
```

Replace `your-org/your-catalog` with your catalog repository. Keep `fetch-depth: 0`: the agent needs it to compare the pull request with its base branch.

To check it works, merge a pull request that changes your architecture, such as a new event or a changed schema. The agent opens a pull request in your catalog, and comments on your pull request with a link to it.

## Choose when it runs

The workflow above runs Code-to-Docs **when a pull request merges**, which we recommend. To run it **while the pull request is open** instead, so reviewers see the catalog update next to the code:

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
```

Remove the job's `if` when you do. See the [introduction](/docs/development/agents/set-up-code-to-docs#choose-when-it-runs) for how the two compare.

Use `pull_request` events, not `push` to your main branch. The agent needs the pull request to compare it with its base branch and to comment on it.

## Use it across your organization

**Choose who reviews.** To send each catalog update to the team that owns that part of the catalog, add a `CODEOWNERS` file to your catalog repository:

```text title=".github/CODEOWNERS"
/domains/Payments/  @acme/payments-platform
/domains/Orders/    @acme/ordering-platform
```

**Set up many repositories at once.** Keep the workflow in one place as a [reusable workflow](https://docs.github.com/en/actions/sharing-automations/reusing-workflows), and call it from each repository:

```yaml title=".github/workflows/eventcatalog.yml in each repository"
on:
  pull_request:
    types: [closed]

jobs:
  eventcatalog:
    if: github.event.pull_request.merged == true
    uses: acme/.github/.github/workflows/eventcatalog-agents.yml@main
    secrets: inherit
```

Use [organization secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions#creating-secrets-for-an-organization) for your model provider key, and a [GitHub App](#use-a-github-app) instead of a personal token.

## Configuration

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `agent` | No | `code-to-docs` | The workflow to run. This workflow is the default. |
| `catalog-repo` | Yes | | Your catalog repository, in `owner/repo` format. |
| `catalog-ref` | No | `main` | The catalog branch to read, and to open pull requests against. |
| `catalog-token` | No | `github.token` | A token that can read the catalog repository, push branches to it and open pull requests. |
| `github-app-client-id` | No | | Client ID of a [GitHub App](#use-a-github-app). Used instead of `catalog-token`. |
| `github-app-private-key` | No | | The private key of that GitHub App. Pass it from a secret. |
| `model` | No | `anthropic/claude-sonnet-4-6` | The model the agent uses. See [models](/docs/development/agents/set-up-code-to-docs#models). |
| `ignore-paths` | No | Build and dependency folders | Comma-separated paths or glob patterns to leave out of the review. |

By default, `ignore-paths` leaves out folders such as `node_modules`, `dist` and `build`. Your list replaces the defaults, so keep the folders you still want left out:

```yaml
with:
  ignore-paths: node_modules,dist,build,src/generated,**/*.test.ts
```

## Use models in your AWS account

To use [Amazon Bedrock](/docs/development/agents/set-up-code-to-docs#models), use an `amazon-bedrock/` model and give the job AWS credentials:

```yaml
permissions:
  id-token: write # for AWS OIDC
  contents: read
  issues: write
  pull-requests: write
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/eventcatalog-agents
      aws-region: eu-west-1
  - uses: event-catalog/agents@v2
    with:
      agent: code-to-docs
      catalog-repo: your-org/your-catalog
      catalog-token: ${{ secrets.EVENTCATALOG_TOKEN }}
      model: amazon-bedrock/eu.anthropic.claude-sonnet-4-6
```

## Use a GitHub App

Instead of a personal access token, you can give the agent a GitHub App. Catalog pull requests then come from the App's bot account, there's no personal token to replace when someone leaves, and each run gets a token that only works on the catalog repository and expires after an hour.

1. [Create a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app) in your organization with **Contents** and **Pull requests** set to **Read and write**. Turn off the webhook.
2. Generate a **private key**, and install the App on your catalog repository.
3. In your source repository, save the App's **Client ID** as a variable and its private key as a secret, and pass them instead of `catalog-token`:

```yaml
with:
  agent: code-to-docs
  catalog-repo: your-org/your-catalog
  github-app-client-id: ${{ vars.EVENTCATALOG_APP_CLIENT_ID }}
  github-app-private-key: ${{ secrets.EVENTCATALOG_APP_PRIVATE_KEY }}
```

## Versions

Use `event-catalog/agents@v2` for the latest v2 release, or an exact release such as `event-catalog/agents@v2.1.0`, which never changes. Releases are listed on [GitHub](https://github.com/event-catalog/agents/tags).
