---
sidebar_position: 3
keywords:
  - Code-to-Docs
  - EventCatalog Agents
  - Azure DevOps
  - Azure Pipelines
  - Azure Repos
sidebar_label: Setup with Azure DevOps
title: Set up Code-to-Docs with Azure DevOps
description: Run the Code-to-Docs workflow in Azure Pipelines, so merged Azure Repos pull requests update your EventCatalog through a catalog pull request.
slug: /development/agents/set-up-code-to-docs/azure-devops
---

Run Code-to-Docs in **Azure Pipelines** on your **Azure Repos** pull requests, from the EventCatalog Agents pipeline template. New to Code-to-Docs? Read the [introduction](/docs/development/agents/set-up-code-to-docs) first.

Once a pull request merges, the pipeline's CI trigger runs the agent on your main branch. It finds the pull request that merged from the merge commit (merge or squash), opens a pull request in your catalog repository, and adds a thread with a link to it on the merged pull request.

## Before you start

You need:

- An Azure DevOps organization with your source code in an **Azure Repos** Git repository (the **source repository**).
- An EventCatalog in an Azure Repos repository (the **catalog repository**), with the catalog at the root of the repository. It can be in another project of the same organization. Or keep it [on GitHub](#use-a-catalog-on-github).
- An API key for an AI model provider.
- **Microsoft-hosted agents**, or a self-hosted Linux agent with internet access. New Azure DevOps organizations have no free Microsoft-hosted agents until you [request them](https://aka.ms/azpipelines-parallelism-request), which usually takes a few days.

## Setup

### 1. Add your model provider key

In **Pipelines → Library**, create a variable group named `eventcatalog`, and add your model provider key as a **secret** variable, such as `ANTHROPIC_API_KEY` (see [models](/docs/development/agents/set-up-code-to-docs#models)). Azure Pipelines passes secret variables to the agent only when you map them in the template's `env` parameter, as the pipeline below does.

### 2. Give the build service access

The agent uses the pipeline's own token (`System.AccessToken`), so you don't need a personal access token. The token belongs to your project's build service, **`<Project> Build Service (<Organization>)`**. If your pipelines aren't limited to the current project, it's **`Project Collection Build Service (<Organization>)`** instead.

In **Project settings → Repositories**, select each repository, open **Security**, find the build service, and allow:

| Repository | Permissions |
| --- | --- |
| Source repository | **Contribute to pull requests**, to comment on the merged pull request |
| Catalog repository | **Read**, **Contribute**, **Create branch** and **Contribute to pull requests**, to open the catalog pull request |

The build service only appears in the list after the pipeline has run once. If your catalog is in a different project, also give the build service [access to that project](https://learn.microsoft.com/azure/devops/pipelines/process/access-tokens#configure-permissions-for-a-project-to-access-another-project-in-the-same-project-collection), or [use a personal access token](#use-a-personal-access-token).

### 3. Add the pipeline

The template lives in the [EventCatalog Agents repository](https://github.com/event-catalog/agents). To use it, reference that repository as a resource. Azure Pipelines needs a [GitHub service connection](https://learn.microsoft.com/azure/devops/pipelines/library/service-endpoints#github-service-connection) to read templates from GitHub. The repository is public, so any connection works. If you can't add one, [copy the template](#use-the-template-without-a-github-connection) instead.

Add this file to your source repository, and create a pipeline from it (**Pipelines → New pipeline → Azure Repos Git → Existing Azure Pipelines YAML file**):

```yaml title="eventcatalog-agents.yml"
trigger:
  branches:
    include: [main] # runs once a pull request merges into main

resources:
  repositories:
    - repository: eventcatalog-agents
      type: github
      endpoint: github # the name of your GitHub service connection
      name: event-catalog/agents
      ref: refs/tags/v2
    - repository: catalog
      type: git
      name: Architecture/eventcatalog # your catalog repository: Project/Repo

pool:
  vmImage: ubuntu-latest

variables:
  - group: eventcatalog # holds ANTHROPIC_API_KEY

jobs:
  - job: code_to_docs
    condition: ne(variables['Build.Reason'], 'PullRequest')
    uses:
      repositories: [catalog]
    steps:
      - checkout: self
        fetchDepth: 0
      - template: azure-pipelines/eventcatalog-agents.yml@eventcatalog-agents
        parameters:
          agent: code-to-docs
          catalogRepo: Architecture/eventcatalog
          env:
            ANTHROPIC_API_KEY: $(ANTHROPIC_API_KEY)
```

Replace `Architecture/eventcatalog` with your catalog repository, as `Project/Repo`, in both places.

- **Keep `fetchDepth: 0`.** The agent needs the history to compare the change with your main branch, and new pipelines fetch only the latest commit by default.
- **Keep the `catalog` resource and `uses`.** They give the job's token access to the catalog repository, which the **Protect access to repositories in YAML pipelines** setting requires. It's on by default. Approve the pipeline's access to the repository on its first run.
- **Leave CI batching off.** A batched build documents only the last pull request it contains.

### 4. Check it works

Merge a pull request that changes your architecture, such as a new event or a changed schema. The pipeline runs on your main branch, the agent opens a pull request in your catalog repository, and adds a thread with a link to it on the pull request you merged.

## Choose when it runs

The pipeline above runs Code-to-Docs **when a pull request merges**, which we recommend. CI builds and runs you queue by hand document the pull request that merged. A commit pushed straight to main has no pull request, and scheduled builds aren't about a pull request, so both are skipped.

To run it **while the pull request is open** instead, so reviewers see the catalog update next to the code, run the job on pull request builds, and add the pipeline to your main branch's build validation:

1. Change the job's condition to `eq(variables['Build.Reason'], 'PullRequest')`, and set `trigger: none`.
2. In **Project settings → Repositories → your source repository → Policies**, open your main branch, and add the pipeline under **Build validation**. Set **Trigger** to _Automatic_ and **Policy requirement** to _Optional_, so a failed run never blocks a merge.

See the [introduction](/docs/development/agents/set-up-code-to-docs#choose-when-it-runs) for how the two compare.

## Use it across your organization

**Choose who reviews.** To send each catalog update to the team that owns that part of the catalog, add **Automatically included reviewers** to your catalog repository's main branch policy, with a **path filter** for each team's part of the catalog, such as `/domains/Payments/*`.

**Set up many repositories at once.** Keep your pipeline file in a shared Azure Repos repository, and have each repository's pipeline [extend it](https://learn.microsoft.com/azure/devops/pipelines/process/templates#extend-from-a-template). Keep the model provider key in one variable group, and give each pipeline access to it.

## Parameters

| Parameter | Required | Default | Description |
| --- | --- | --- | --- |
| `agent` | No | `code-to-docs` | The workflow to run. This workflow is the default. |
| `catalogRepo` | Yes | | Your catalog repository: `Project/Repo` (or `Repo` in the same project), or its URL. `owner/repo` for GitHub. |
| `catalogRef` | No | `main` | The catalog branch to read, and to open pull requests against. |
| `catalogProvider` | No | `azure-devops` | Where your catalog is hosted: `azure-devops` or `github`. |
| `catalogToken` | No | `$(System.AccessToken)` | A token that can read the catalog repository, push branches to it and open pull requests. |
| `model` | No | `anthropic/claude-sonnet-4-6` | The model the agent uses. See [models](/docs/development/agents/set-up-code-to-docs#models). |
| `ignorePaths` | No | Build and dependency folders | Comma-separated paths or glob patterns to leave out of the review. Your list replaces the defaults. |
| `workspace` | No | `$(Build.SourcesDirectory)` | The source checkout to compare. If a job checks out more than one repository, `self` moves to `$(Build.SourcesDirectory)/<repo>`: set this to match. |
| `agentsVersion` | No | `v2` | The EventCatalog Agents release to run. Keep it the same as the `ref` of the `eventcatalog-agents` resource. |
| `env` | No | `{}` | Environment variables for the agent, such as your model provider key: `{ ANTHROPIC_API_KEY: $(ANTHROPIC_API_KEY) }`. |

To pin an exact release, set both the resource's `ref` (for example `refs/tags/v2.3.0`) and `agentsVersion: v2.3.0`.

## Use a catalog on GitHub

To keep your catalog on GitHub with your code in Azure Repos, set `catalogProvider: github`, set `catalogRepo` to `owner/repo`, and pass a GitHub token from a secret variable. A [fine-grained token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) scoped to the catalog repository needs **Contents** and **Pull requests** set to **Read and write**. You don't need the `catalog` repository resource or `uses`.

```yaml
- template: azure-pipelines/eventcatalog-agents.yml@eventcatalog-agents
  parameters:
    agent: code-to-docs
    catalogProvider: github
    catalogRepo: your-org/your-catalog
    catalogToken: $(GITHUB_CATALOG_TOKEN)
    env:
      ANTHROPIC_API_KEY: $(ANTHROPIC_API_KEY)
```

## Use a personal access token

To open catalog pull requests as a person or a service account rather than the build service, create a personal access token with the **Code (Read & write)** scope, save it as a secret variable, and pass it as `catalogToken: $(EVENTCATALOG_TOKEN)`. The thread on the source pull request still comes from the build service.

## Use the template without a GitHub connection

Copy [`azure-pipelines/eventcatalog-agents.yml`](https://github.com/event-catalog/agents/blob/main/azure-pipelines/eventcatalog-agents.yml) into your repository, or into a shared templates repository in Azure Repos, and reference it by path, such as `template: templates/eventcatalog-agents.yml`. Set `agentsVersion` to the release you copied it from. The template still downloads the agent from GitHub when it runs, so the build agent needs internet access, as it does for your model provider and npm.

## Differences from GitHub

- **The comment is a closed thread**, because there is nothing to resolve on the pull request. Reruns update the same thread.
- **Catalog pull request descriptions** are shortened to fit Azure DevOps' 4,000-character limit.

## Troubleshooting

| Message | What to do |
| --- | --- |
| `Cannot find the commits to compare` | Set `fetchDepth: 0` on the `checkout: self` step. |
| `Catalog token cannot access …` or `Could not fetch branch …` | Give the build service the [permissions above](#2-give-the-build-service-access), and keep the `catalog` resource and `uses` in the job. |
| `failed (401): the token was not accepted` | Your personal access token has expired, or lacks the **Code** scope. |
| `No completed pull request merged as commit …` | The build was for a commit pushed straight to main. There is nothing to document. |
| No thread on the merged pull request | Give the build service **Contribute to pull requests** on the source repository. |

## Azure DevOps Server

The agent uses Azure DevOps REST API version 6.0, which Azure DevOps Server 2020 and later support, so it should work on Azure DevOps Server too. We test with Azure DevOps Services. A full `catalogRepo` URL on Server must include the project: `https://server/tfs/Collection/Project/_git/Repo`.
