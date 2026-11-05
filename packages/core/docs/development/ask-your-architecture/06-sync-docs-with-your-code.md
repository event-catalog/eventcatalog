---
sidebar_position: 6
keywords:
  - Code-to-Docs
  - EventCatalog Agents
  - documentation automation
  - docs drift
  - GitHub Actions
sidebar_label: Sync docs with your code
title: Sync docs with your code
description: The Code-to-Docs workflow updates your EventCatalog when a pull request changes your architecture, and opens a pull request in your catalog for your team to review.
slug: /development/agents/set-up-code-to-docs
---

import { AgentFlow, CodeToDocsComment, OrgTopology } from '@site/src/components/AgentOutputs';
import { AgentPrompt } from '@site/src/components/AgentPrompt';

The **Code-to-Docs** workflow turns your catalog into self-updating knowledge of your architecture. When a pull request changes your architecture, it updates the docs the change affects, and opens a pull request in your catalog for your team to review.

<AgentPrompt variant="code-to-docs" />

Docs that drift stop being used. When your catalog matches what's running, engineers can trust it to answer questions without reading the code, and AI tools that read your catalog get the right answers too.

- **Bring your own model.** Use any model you want, with your own key. You pay your provider directly.
- **Your data stays private.** It runs in your own CI and sends code only to your model provider. We never see your code or your catalog.
- **Your own workflow.** You decide which repositories update which catalog, when, and who approves the changes.

## How it works

<AgentFlow />

1. **Reads the change.** The agent reads the pull request's diff and the code around it, and finds the affected resources in your catalog.
2. **Plans.** It decides which resources need to change and why. If nothing needs to change, it says so and stops.
3. **Updates your catalog.** It edits only the resources in its plan, the way your catalog is already written. If it edits a file outside its plan, the run stops and nothing is pushed.
4. **Checks its work.** It runs the EventCatalog linter and your [fitness functions](/blog/architecture-fitness-functions), and fixes the problems it caused. It never edits fitness functions.
5. **Opens a pull request** in your catalog, and comments on your pull request with a link to it.

The agent can get things wrong, so review every catalog pull request.

## Before you start

You need:

- An EventCatalog in a GitHub repository (the **catalog repository**), with the catalog at the root of the repository.
- A repository with code to document (the **source repository**).
- An API key for an AI model provider.

## Set it up

In your source repository, add two secrets under **Settings → Secrets and variables → Actions**:

- `ANTHROPIC_API_KEY`, or the key for [your model provider](#models).
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
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        with:
          agent: code-to-docs
          catalog-repo: your-org/your-catalog
          catalog-token: ${{ secrets.EVENTCATALOG_TOKEN }}
```

Replace `your-org/your-catalog` with your catalog repository. Keep `fetch-depth: 0`: the agent needs it to compare the pull request with its base branch.

To check it works, merge a pull request that changes your architecture, such as a new event or a changed schema. The agent opens a pull request in your catalog, and comments on your pull request:

<CodeToDocsComment />

## Choose when it runs

We recommend running Code-to-Docs **when a pull request merges**, as above. It documents what shipped, runs once per pull request, and never documents abandoned work. A pull request closed without merging is skipped.

To show the catalog update to reviewers next to the code, run it **while the pull request is open** instead:

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
```

| | When the pull request merges | While the pull request is open |
| --- | --- | --- |
| Catalog pull request appears | After the merge | Before the merge, next to the code |
| Agent runs | Once per pull request | On every push |
| Abandoned pull requests | Never documented | Leave a catalog pull request for you to close |

Use `pull_request` events, not `push` to your main branch. The agent needs the pull request to compare it with its base branch and to comment on it.

## Use it across your organization

<OrgTopology />

- **One catalog for the organization.** Add the workflow to each repository with the same `catalog-repo`. The agent puts each change in the right domain and system.
- **A catalog per team.** Point each repository's `catalog-repo` at its team's catalog. [Federation](/docs/federation/overview) combines the team catalogs into one organization-wide catalog.

**Choose who reviews.** Catalog updates are pull requests, so your branch protection, required reviews and code owners apply. To send each update to the team that owns that part of the catalog, add a `CODEOWNERS` file to your catalog repository:

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
| `model` | No | `anthropic/claude-sonnet-4-6` | The model the agent uses. See [models](#models). |
| `ignore-paths` | No | Build and dependency folders | Comma-separated paths or glob patterns to leave out of the review. |

By default, `ignore-paths` leaves out folders such as `node_modules`, `dist` and `build`. Your list replaces the defaults, so keep the folders you still want left out:

```yaml
with:
  ignore-paths: node_modules,dist,build,src/generated,**/*.test.ts
```

## Models

Use any model from [these providers](https://pi.dev/models). Set `model` to a provider and model name, and pass your provider's key as an environment variable on the step:

| Provider | Model example | Environment variable |
| --- | --- | --- |
| Anthropic | `anthropic/claude-sonnet-4-6` | `ANTHROPIC_API_KEY` |
| OpenAI | `openai/gpt-5.1` | `OPENAI_API_KEY` |
| OpenRouter | `openrouter/anthropic/claude-sonnet-4.6` | `OPENROUTER_API_KEY` |

We test with `anthropic/claude-sonnet-4-6`, the default. Smaller models are cheaper, but follow your catalog's conventions less reliably.

To use models in your own AWS account, use an `amazon-bedrock/` model and give the job AWS credentials. Your code is then sent only to Bedrock, in the region you choose:

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

## Data and privacy

- **Your code goes to one place:** the model provider you configure. The agent runs in your GitHub Actions runner. EventCatalog never receives your code, your catalog or your pull requests.
- **It only changes your catalog through pull requests**, on branches named `eventcatalog-actions/...`. It never pushes to your catalog's main branch.
- **Your catalog's tools run without your secrets.** The linter and your fitness functions run as separate processes, without your model provider key or GitHub tokens.

Each run sends one anonymous usage event: the outcome and the kind of error if it failed, the model, the run's duration, whether the pull request was open or merged, the repository name, and how many of the agent's catalog pull requests are open, merged or closed. It never contains code, file names, paths, diffs or pull request content. To turn it off, set `POSTHOG_KEY: ''` in the step's `env`.

## Versions

Use `event-catalog/agents@v2` for the latest v2 release, or an exact release such as `event-catalog/agents@v2.1.0`, which never changes. Releases are listed on [GitHub](https://github.com/event-catalog/agents/tags).
