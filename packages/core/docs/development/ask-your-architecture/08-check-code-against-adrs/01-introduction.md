---
sidebar_position: 1
keywords:
  - ADR Compliance
  - EventCatalog Agents
  - architecture decision records
  - ADR governance
  - GitHub Actions
  - Azure DevOps
  - Bitbucket
sidebar_label: Introduction
title: Check code against ADRs
description: The ADR Compliance workflow comments on pull requests when the code conflicts with an architecture decision documented in your EventCatalog, citing the line and the decision. Runs in GitHub Actions, Azure Pipelines or Bitbucket Pipelines.
slug: /development/agents/set-up-adr-compliance
---

import { AdrComplianceComment } from '@site/src/components/AgentOutputs';
import { AgentPrompt } from '@site/src/components/AgentPrompt';

The **ADR Compliance** workflow checks the code changed in a pull request against the [architecture decision records](/docs/development/guides/resources/adrs/introduction) in your catalog. You choose which ADRs apply to the repository. If the code clearly conflicts with one, it comments with the line, the decision, and how to fix it. It never edits your catalog or blocks a merge.

<AgentPrompt variant="adr-compliance" />

### Example

<AdrComplianceComment />

## How it works

1. **Selects the ADRs.** It finds the ADRs matching your `adrs` setting, and keeps the `accepted` ones at their latest version. If an accepted ADR amends one of them, it's included too, because the decision can't be judged correctly without it.
2. **Finds the relevant ones.** It compares the ADR summaries with the changes, so only ADRs on the same topic are reviewed in full.
3. **Reviews the changed lines.** It reports only clear conflicts. Code that follows an ADR, code the pull request didn't change, and comments that merely mention something an ADR rules out are not conflicts. A decision for a domain or system takes precedence over a broader one on the same topic.
4. **Checks its citations.** The line must be one the pull request changed, and the quoted sentence must be in the ADR. A conflict that fails this check is dropped.
5. **Comments on the pull request** with each conflict. The comment updates on every push, and says so once the conflicts are gone.

If there are no conflicts, it doesn't comment.

## Choose which ADRs to check

The `adrs` setting is required. It takes comma-separated globs, relative to the root of your catalog. ADRs can live in any `adrs` folder in your catalog, so point the globs at wherever yours are:

| To check against | Use |
| --- | --- |
| ADRs in the top-level `adrs` folder | `adrs/**` |
| A domain, and everything nested in it | `domains/Orders/**` |
| One system | `domains/Orders/systems/checkout-system/**` |
| One service | `domains/Orders/services/OrdersAPI/**` |
| ADRs that share a naming convention | `adrs/adr-orders-*/**` |
| One ADR | `adrs/adr-012-use-outbox` |
| Every ADR in the catalog | `'**/adrs/**'` |

A typical repository checks against your organization-wide ADRs and those of its own domain:

```yaml
adrs: adrs/**, domains/Orders/**
```

Globs start at the catalog root, so `adrs/**` means only the top-level folder, not every folder called `adrs`. A value that starts with `*` needs quotes in YAML.

If `adrs` is missing or matches no ADRs, the run fails with an error that shows where your ADRs are, so a typo can't look like a clean pass.

:::tip
Checking every ADR in the catalog can raise conflicts with decisions meant for other teams. Start with the ADRs that apply to the repository.
:::

## Record an exception

If a conflict is intentional, add a line to the pull request description with the ADR's `id` and your reason:

```text
adr-exception: adr-003-offload-async-work-to-worker small thumbnails only
```

The conflict then moves to an exceptions list in the comment, so reviewers can still see it. The agent reads the description when it runs, so push a commit or re-run the check after adding the line.

A reason is required: a line without one is ignored. Exceptions are visible rather than enforced, so anyone who can edit the description can add one.

If the decision itself has changed, propose a new ADR in your catalog instead. See [ADR relationships](/docs/development/guides/resources/adrs/relationships).

## Choose your platform

ADR Compliance runs where your pull requests are, while they're open, so a conflict is raised while the code can still change. Your source code and your catalog don't have to be on the same platform:

| Source code in | Catalog in | Set up with |
| --- | --- | --- |
| GitHub | GitHub | [GitHub Actions](/docs/development/agents/set-up-adr-compliance/github) |
| Azure Repos | Azure Repos | [Azure Pipelines](/docs/development/agents/set-up-adr-compliance/azure-devops) |
| Azure Repos | GitHub | [Azure Pipelines](/docs/development/agents/set-up-adr-compliance/azure-devops#use-a-catalog-on-github), with the catalog on GitHub |
| Bitbucket | Bitbucket | [Bitbucket Pipelines](/docs/development/agents/set-up-adr-compliance/bitbucket) |
| Bitbucket | GitHub | [Bitbucket Pipelines](/docs/development/agents/set-up-adr-compliance/bitbucket#use-a-catalog-on-github), with the catalog on GitHub |

Whichever you choose, you need:

- An EventCatalog in a repository (the **catalog repository**), with the catalog at the root of the repository, and your decisions documented as [ADRs](/docs/development/guides/resources/adrs/creating-adrs).
- A repository with the code you want to check (the **source repository**).
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

ADR Compliance needs `v2.2.0` or later on GitHub, `v2.3.0` or later in Azure DevOps, and `v2.4.0` or later in Bitbucket. Use `v2` for the latest v2 release, or an exact release, which never changes. Releases are listed on [GitHub](https://github.com/event-catalog/agents/tags).

## Set it up

- [Setup with GitHub](/docs/development/agents/set-up-adr-compliance/github)
- [Setup with Azure DevOps](/docs/development/agents/set-up-adr-compliance/azure-devops)
- [Setup with Bitbucket](/docs/development/agents/set-up-adr-compliance/bitbucket)
