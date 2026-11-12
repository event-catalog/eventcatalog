---
sidebar_position: 1
keywords:
  - Breaking Changes
  - EventCatalog Agents
  - schema governance
  - schema compatibility
  - GitHub Actions
  - Azure DevOps
  - Bitbucket
sidebar_label: Introduction
title: Catch breaking changes
description: The Breaking Changes workflow comments on pull requests when a schema change would break a consumer documented in your EventCatalog, with the consumers and their owners. Runs in GitHub Actions, Azure Pipelines or Bitbucket Pipelines.
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

## Which files are checked

By default, the agent treats these files as message schemas: `.json`, `.yml`, `.yaml`, `.avro`, `.avsc`, `.proto`, `.graphql` and `.gql`. To check message contracts in other files, such as TypeScript types, list their extensions in the schema extensions setting (`schema-extensions` on GitHub, `schemaExtensions` in Azure Pipelines, `--schema-extensions` in Bitbucket Pipelines). Your list replaces the defaults, so include every extension you want checked.

Only add source code extensions for files that contain message contracts: every changed file with a listed extension is checked.

## Choose your platform

Breaking Changes runs where your pull requests are, while they're open, so the warning arrives before the change merges. Your source code and your catalog don't have to be on the same platform:

| Source code in | Catalog in | Set up with |
| --- | --- | --- |
| GitHub | GitHub | [GitHub Actions](/docs/development/agents/set-up-breaking-changes/github) |
| Azure Repos | Azure Repos | [Azure Pipelines](/docs/development/agents/set-up-breaking-changes/azure-devops) |
| Azure Repos | GitHub | [Azure Pipelines](/docs/development/agents/set-up-breaking-changes/azure-devops#use-a-catalog-on-github), with the catalog on GitHub |
| Bitbucket | Bitbucket | [Bitbucket Pipelines](/docs/development/agents/set-up-breaking-changes/bitbucket) |
| Bitbucket | GitHub | [Bitbucket Pipelines](/docs/development/agents/set-up-breaking-changes/bitbucket#use-a-catalog-on-github), with the catalog on GitHub |

Whichever you choose, you need:

- An EventCatalog in a repository (the **catalog repository**), with the catalog at the root of the repository, and the consumers of your messages documented in it.
- A repository with message schemas (the **source repository**).
- An API key for an AI model provider.

## Models

Use any model from [these providers](https://pi.dev/models). Set `model` to a provider and model name, and pass your provider's key to the agent as an environment variable:

| Provider | Model example | Environment variable |
| --- | --- | --- |
| Anthropic | `anthropic/claude-sonnet-4-6` | `ANTHROPIC_API_KEY` |
| OpenAI | `openai/gpt-5.1` | `OPENAI_API_KEY` |
| OpenRouter | `openrouter/anthropic/claude-sonnet-4.6` | `OPENROUTER_API_KEY` |

To use models in your own AWS account, use an `amazon-bedrock/` model, such as `amazon-bedrock/eu.anthropic.claude-sonnet-4-6`, and give the job AWS credentials.

## Data and privacy

- **It's read-only.** It only comments on pull requests, and never edits your catalog.
- **Your code goes to one place:** the model provider you configure. The agent runs in your own CI runner. EventCatalog never receives your code, your catalog or your pull requests.

Each run sends one anonymous usage event: the outcome and the kind of error if it failed, the model, the run's duration, whether the pull request was open or merged, the repository name, and the CI system. It never contains code, file names, paths, diffs or pull request content. To turn it off, set `POSTHOG_KEY: ''` in the agent's environment.

## Versions

Use `v2` for the latest v2 release, or an exact release such as `v2.1.0`, which never changes. Azure DevOps support needs `v2.3.0` or later, and Bitbucket support `v2.4.0` or later. Releases are listed on [GitHub](https://github.com/event-catalog/agents/tags).

## Set it up

- [Setup with GitHub](/docs/development/agents/set-up-breaking-changes/github)
- [Setup with Azure DevOps](/docs/development/agents/set-up-breaking-changes/azure-devops)
- [Setup with Bitbucket](/docs/development/agents/set-up-breaking-changes/bitbucket)
