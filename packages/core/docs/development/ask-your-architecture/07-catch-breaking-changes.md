---
sidebar_position: 7
keywords:
  - Breaking Changes
  - EventCatalog Agents
  - schema governance
  - schema compatibility
  - GitHub Actions
sidebar_label: Catch breaking changes
title: Catch breaking changes
description: The Breaking Changes workflow comments on pull requests when a schema change would break a consumer documented in your EventCatalog, with the consumers and their owners.
slug: /development/agents/set-up-breaking-changes
---

import { BreakingChangesComment } from '@site/src/components/AgentOutputs';
import { AgentPrompt } from '@site/src/components/AgentPrompt';

The **Breaking Changes** workflow checks the message schemas changed in a pull request. If a change would break consumers documented in your catalog, it comments with what breaks, who is affected, and who owns them, before the change merges. It never edits your catalog.

<AgentPrompt variant="breaking-changes" />

<BreakingChangesComment />

## How it works

1. **Finds changed schemas.** It looks for changed schema files in the pull request.
2. **Checks each change.** A change is breaking when existing consumers could fail: a removed or renamed field, a changed type, a new required field, a narrowed enum, and similar. Additive changes, such as a new optional field, are not breaking.
3. **Finds the consumers.** It matches the schema to its message in your catalog, then finds every service, agent or domain that receives it at an affected version.
4. **Comments on the pull request** with the breaking lines and each consumer with its owners.

If the pull request changes no schemas, or none of the changes are breaking, it doesn't comment. If a breaking change has no consumers in your catalog, the comment says so.

A consumer is affected when it receives the message at its current version, at `latest` or with no version, or at a range that includes the current version, such as `1.x`. Consumers pinned to an older version are listed too, with their version. The reason given for each consumer comes from your catalog, such as "Receives payment-succeeded 1.0.0". The agent doesn't guess how a consumer uses particular fields.

## Before you start

You need:

- An EventCatalog in a GitHub repository (the **catalog repository**), with the catalog at the root of the repository, and the consumers of your messages documented in it.
- A repository with message schemas (the **source repository**).
- An API key for an AI model provider.

## Set it up

In your source repository, add two secrets under **Settings → Secrets and variables → Actions**:

- `ANTHROPIC_API_KEY`, or the key for [your model provider](#models).
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
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        with:
          agent: breaking-changes
          catalog-repo: your-org/your-catalog
          catalog-token: ${{ secrets.EVENTCATALOG_TOKEN }}
```

Replace `your-org/your-catalog` with your catalog repository. Keep `fetch-depth: 0`: the agent needs it to compare the pull request with its base branch.

To check it works, open a pull request that removes a field from a schema that a service in your catalog consumes.

If you also [sync docs with your code](/docs/development/agents/set-up-code-to-docs), you can run both from one workflow file: add `closed` to the `types`, and give each job an `if`:

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
| `model` | No | `anthropic/claude-sonnet-4-6` | The model the agent uses. See [models](#models). |
| `schema-extensions` | No | `.json,.yml,.yaml,.avro,.avsc,.proto,.graphql,.gql` | The file extensions treated as message schemas. |
| `ignore-paths` | No | Build and dependency folders | Comma-separated paths or glob patterns to leave out of the review. |

To check message contracts in other files, such as TypeScript types, set `schema-extensions`. Your list replaces the defaults, so include every extension you want checked:

```yaml
with:
  schema-extensions: .json,.yaml,.ts
```

Only add source code extensions for files that contain message contracts: every changed file with a listed extension is checked.

## Models

Use any model from [these providers](https://pi.dev/models). Set `model` to a provider and model name, and pass your provider's key as an environment variable on the step:

| Provider | Model example | Environment variable |
| --- | --- | --- |
| Anthropic | `anthropic/claude-sonnet-4-6` | `ANTHROPIC_API_KEY` |
| OpenAI | `openai/gpt-5.1` | `OPENAI_API_KEY` |
| OpenRouter | `openrouter/anthropic/claude-sonnet-4.6` | `OPENROUTER_API_KEY` |

To use models in your own AWS account, use an `amazon-bedrock/` model, such as `amazon-bedrock/eu.anthropic.claude-sonnet-4-6`, and give the job AWS credentials with [`aws-actions/configure-aws-credentials`](https://github.com/aws-actions/configure-aws-credentials).

## Data and privacy

- **It's read-only.** It only comments on pull requests, and never edits your catalog.
- **Your code goes to one place:** the model provider you configure. The agent runs in your GitHub Actions runner. EventCatalog never receives your code, your catalog or your pull requests.

Each run sends one anonymous usage event: the outcome and the kind of error if it failed, the model, the run's duration, whether the pull request was open or merged, and the repository name. It never contains code, file names, paths, diffs or pull request content. To turn it off, set `POSTHOG_KEY: ''` in the step's `env`.

## Versions

Use `event-catalog/agents@v2` for the latest v2 release, or an exact release such as `event-catalog/agents@v2.1.0`, which never changes. Releases are listed on [GitHub](https://github.com/event-catalog/agents/tags).
