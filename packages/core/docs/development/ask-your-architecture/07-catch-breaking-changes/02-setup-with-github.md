---
sidebar_position: 2
keywords:
  - Breaking Changes
  - EventCatalog Agents
  - GitHub Actions
sidebar_label: Setup with GitHub
title: Set up Breaking Changes with GitHub
description: Run the Breaking Changes workflow in GitHub Actions, so pull requests that break a documented consumer get a comment before they merge.
slug: /development/agents/set-up-breaking-changes/github
---

Run Breaking Changes in **GitHub Actions** with the `event-catalog/agents` action. New to Breaking Changes? Read the [introduction](/docs/development/agents/set-up-breaking-changes) first.

## Before you start

You need:

- An EventCatalog in a GitHub repository (the **catalog repository**), with the catalog at the root of the repository, and the consumers of your messages documented in it.
- A GitHub repository with message schemas (the **source repository**).
- An API key for an AI model provider.

## Setup

In your source repository, add two secrets under **Settings → Secrets and variables → Actions**:

- `ANTHROPIC_API_KEY`, or the key for [your model provider](/docs/development/agents/set-up-breaking-changes#models).
- `EVENTCATALOG_TOKEN`, a GitHub token that can read your catalog repository. The workflow never writes to it.

Then add the workflow. It runs while the pull request is open, so the warning arrives before the change merges:

```yaml title=".github/workflows/eventcatalog-breaking-changes.yml"
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  breaking-changes:
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
          agent: breaking-changes
          # Your catalog repository, in owner/repo format.
          catalog-repo: your-org/your-catalog
          # A token that can read your catalog repository.
          catalog-token: ${{ secrets.EVENTCATALOG_TOKEN }}
          # Optional: the model to use. Defaults to anthropic/claude-sonnet-4-6.
          # model: openai/gpt-5.1
```

Replace `your-org/your-catalog` with your catalog repository. Keep `fetch-depth: 0`: the agent needs it to compare the pull request with its base branch.

To check it works, open a pull request that removes a field from a schema that a service in your catalog consumes.

## Run it with Code-to-Docs

If you also [sync docs with your code](/docs/development/agents/set-up-code-to-docs/github), you can run both from one workflow file: add `closed` to the `types`, and give each job an `if`:

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

jobs:
  breaking-changes:
    if: github.event.action != 'closed'
    # ... as above

  code-to-docs:
    if: github.event.action == 'closed' && github.event.pull_request.merged == true
    # ...
```

## Configuration

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `agent` | Yes | | Set to `breaking-changes` to run this workflow. |
| `catalog-repo` | Yes | | Your catalog repository, in `owner/repo` format. |
| `catalog-ref` | No | `main` | The catalog branch to read. |
| `catalog-token` | No | `github.token` | A token that can read the catalog repository. |
| `catalog-url` | No | | The URL of your hosted catalog. The comment links consumers and owners to it. |
| `model` | No | `anthropic/claude-sonnet-4-6` | The model the agent uses. See [models](/docs/development/agents/set-up-breaking-changes#models). |
| `schema-extensions` | No | `.json,.yml,.yaml,.avro,.avsc,.proto,.graphql,.gql` | The file extensions treated as message schemas. See [which files are checked](/docs/development/agents/set-up-breaking-changes#which-files-are-checked). |
| `ignore-paths` | No | Build and dependency folders | Comma-separated paths or glob patterns to leave out of the review. |

For example, to also check TypeScript types:

```yaml
with:
  schema-extensions: .json,.yaml,.ts
```

## Use models in your AWS account

To use Amazon Bedrock, use an `amazon-bedrock/` model, such as `amazon-bedrock/eu.anthropic.claude-sonnet-4-6`, and give the job AWS credentials with [`aws-actions/configure-aws-credentials`](https://github.com/aws-actions/configure-aws-credentials). See [the Code-to-Docs example](/docs/development/agents/set-up-code-to-docs/github#use-models-in-your-aws-account).

## Versions

Use `event-catalog/agents@v2` for the latest v2 release, or an exact release such as `event-catalog/agents@v2.1.0`, which never changes. Releases are listed on [GitHub](https://github.com/event-catalog/agents/tags).
