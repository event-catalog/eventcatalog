---
sidebar_position: 1
keywords:
  - Code-to-Docs
  - EventCatalog Agents
  - documentation automation
  - docs drift
  - GitHub Actions
  - Azure DevOps
  - Bitbucket
sidebar_label: Introduction
title: Sync docs with your code
description: The Code-to-Docs workflow updates your EventCatalog when a pull request changes your architecture, and opens a pull request in your catalog for your team to review. Runs in GitHub Actions, Azure Pipelines or Bitbucket Pipelines.
slug: /development/agents/set-up-code-to-docs
---

import { AgentFlow, CodeToDocsComment, OrgTopology } from '@site/src/components/AgentOutputs';
import { AgentPrompt } from '@site/src/components/AgentPrompt';

The **Code-to-Docs** workflow turns your catalog into self-updating knowledge of your architecture. When a pull request changes your architecture, it updates the docs the change affects, and opens a pull request in your catalog for your team to review.

<AgentPrompt variant="code-to-docs" />

Docs that drift stop being used. When your catalog matches what's running, engineers can trust it to answer questions without reading the code, and AI tools that read your catalog get the right answers too.

- **Bring your own model.** Use any model you want, with your own key. You pay your provider directly.
- **Your data stays private.** It runs in your own CI, in GitHub Actions, Azure Pipelines or Bitbucket Pipelines, and sends code only to your model provider. We never see your code or your catalog.
- **Your own workflow.** You decide which repositories update which catalog, when, and who approves the changes.

## How it works

<AgentFlow />

1. **Reads the change.** The agent reads the pull request's diff and the code around it, and finds the affected resources in your catalog.
2. **Plans.** It decides which resources need to change and why. If nothing needs to change, it says so and stops.
3. **Updates your catalog.** It edits only the resources in its plan, the way your catalog is already written. If it edits a file outside its plan, the run stops and nothing is pushed.
4. **Checks its work.** It runs the EventCatalog linter and your [fitness functions](/blog/architecture-fitness-functions), and fixes the problems it caused. It never edits fitness functions.
5. **Opens a pull request** in your catalog, and comments on your pull request with a link to it:

<CodeToDocsComment />

The agent can get things wrong, so review every catalog pull request.

## Choose your platform

Code-to-Docs runs where your pull requests are. Your source code and your catalog don't have to be on the same platform:

| Source code in | Catalog in | Set up with |
| --- | --- | --- |
| GitHub | GitHub | [GitHub Actions](/docs/development/agents/set-up-code-to-docs/github) |
| Azure Repos | Azure Repos | [Azure Pipelines](/docs/development/agents/set-up-code-to-docs/azure-devops) |
| Azure Repos | GitHub | [Azure Pipelines](/docs/development/agents/set-up-code-to-docs/azure-devops#use-a-catalog-on-github), with the catalog on GitHub |
| Bitbucket | Bitbucket | [Bitbucket Pipelines](/docs/development/agents/set-up-code-to-docs/bitbucket) |
| Bitbucket | GitHub | [Bitbucket Pipelines](/docs/development/agents/set-up-code-to-docs/bitbucket#use-a-catalog-on-github), with the catalog on GitHub |

Whichever you choose, you need:

- An EventCatalog in a repository (the **catalog repository**), with the catalog at the root of the repository.
- A repository with code to document (the **source repository**).
- An API key for an AI model provider.

## Choose when it runs

We recommend running Code-to-Docs **when a pull request merges**. It documents what shipped, runs once per pull request, and never documents abandoned work. A pull request closed without merging is skipped.

To show the catalog update to reviewers next to the code, run it **while the pull request is open** instead:

| | When the pull request merges | While the pull request is open |
| --- | --- | --- |
| Catalog pull request appears | After the merge | Before the merge, next to the code |
| Agent runs | Once per pull request | On every push |
| Abandoned pull requests | Never documented | Leave a catalog pull request for you to close |

The setup guides for [GitHub](/docs/development/agents/set-up-code-to-docs/github#choose-when-it-runs), [Azure DevOps](/docs/development/agents/set-up-code-to-docs/azure-devops#choose-when-it-runs) and [Bitbucket](/docs/development/agents/set-up-code-to-docs/bitbucket#choose-when-it-runs) show both.

## Use it across your organization

<OrgTopology />

- **One catalog for the organization.** Point each repository at the same catalog. The agent puts each change in the right domain and system.
- **A catalog per team.** Point each repository at its team's catalog. [Federation](/docs/federation/overview) combines the team catalogs into one organization-wide catalog.

Catalog updates are pull requests, so your branch protection, required reviewers and code owners apply. The setup guides show how to send each update to the team that owns that part of the catalog, and how to set up many repositories at once.

## Models

Use any model from [these providers](https://pi.dev/models). Set `model` to a provider and model name, and pass your provider's key to the agent as an environment variable:

| Provider | Model example | Environment variable |
| --- | --- | --- |
| Anthropic | `anthropic/claude-sonnet-4-6` | `ANTHROPIC_API_KEY` |
| OpenAI | `openai/gpt-5.1` | `OPENAI_API_KEY` |
| OpenRouter | `openrouter/anthropic/claude-sonnet-4.6` | `OPENROUTER_API_KEY` |

We test with `anthropic/claude-sonnet-4-6`, the default. Smaller models are cheaper, but follow your catalog's conventions less reliably.

To use models in your own AWS account, use an `amazon-bedrock/` model, such as `amazon-bedrock/eu.anthropic.claude-sonnet-4-6`, and give the job AWS credentials. Your code is then sent only to Bedrock, in the region you choose.

## Data and privacy

- **Your code goes to one place:** the model provider you configure. The agent runs in your own CI runner. EventCatalog never receives your code, your catalog or your pull requests.
- **It only changes your catalog through pull requests**, on branches named `eventcatalog-actions/...`. It never pushes to your catalog's main branch.
- **Your catalog's tools run without your secrets.** The linter and your fitness functions run as separate processes, without your model provider key or your GitHub, Azure DevOps or Bitbucket tokens.

Each run sends one anonymous usage event: the outcome and the kind of error if it failed, the model, the run's duration, whether the pull request was open or merged, the repository name, the CI system, and how many of the agent's catalog pull requests are open, merged or closed. It never contains code, file names, paths, diffs or pull request content. To turn it off, set `POSTHOG_KEY: ''` in the agent's environment.

## Versions

Use `v2` for the latest v2 release, or an exact release such as `v2.1.0`, which never changes. Azure DevOps support needs `v2.3.0` or later, and Bitbucket support `v2.4.0` or later. Releases are listed on [GitHub](https://github.com/event-catalog/agents/tags).

## Set it up

- [Setup with GitHub](/docs/development/agents/set-up-code-to-docs/github)
- [Setup with Azure DevOps](/docs/development/agents/set-up-code-to-docs/azure-devops)
- [Setup with Bitbucket](/docs/development/agents/set-up-code-to-docs/bitbucket)
