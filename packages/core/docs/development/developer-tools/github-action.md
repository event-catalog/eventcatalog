---
sidebar_position: 6
keywords:
- EventCatalog components
sidebar_label: AI Reviewer
title: AI Reviewer
description: Integrate EventCatalog with GitHub Actions
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import EventCatalogPro from '@site/src/components/MDX/EventCatalogPro';

<EventCatalogPro />



The [EventCatalog GitHub Action](https://github.com/event-catalog/github-action) brings AI-powered insight into your Git workflows. It uses large language models (LLMs) to automatically review changes to your EventCatalog, helping you catch issues early—before they reach production. You can pick from OpenAI, Anthropic, or Google.

Think of it as a smart assistant for your pull requests. It doesn't just lint code—it understands the implications of your changes.

<details>
<summary>Watch the video to see the GitHub Action in action</summary>

<iframe width="100%" height="
515" src="https://www.youtube.com/embed/xAQ20eAfKsI?si=ZNQMEcAkDSjfIa3b" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
</details>

**What it does:**

- Detect breaking changes in schemas during pull requests
- Score how likely a change is to cause issues
- List affected consumers so you know who’s impacted
- Recommend actions to resolve problems before merging

By automating the review process, this GitHub Action saves your team hours of manual effort, reduces human error, and brings consistency to your EventCatalog maintenance.

You’re always in control—the final merge decision is still up to you. But now, you’ll have the insights to make it with confidence.


<img src="/img/github-actions.png" alt="EventCatalog GitHub Action" />

### Functionality

The GitHub action supports many different tasks, and you can use the same action for multiple tasks.

Tasks:

- [schema_review](./github-action.md#task-automated-schema-reviews):
  -  Automatically review the schemas for breaking changes in your pull requests

_More tasks will be added in the future_




---

### Task: Automated schema reviews

The schema review task is used to review schemas for breaking changes. This task let's you catch breaking changes in your schemas before they are deployed.

The schema review supports any schema format, including (JSON, Avro, Protobuf, Thrift, etc.).

<img src="/img/github-actions.png" alt="EventCatalog GitHub Action" width="30%" />



**Why use the schema review task?**

- Capture breaking changes in your schemas before they are deployed
- Get a score of how likely the changes are to be breaking
- See a list of consumers that will be affected by the changes
- Take action to fix breaking changes before they are deployed

**Workflow example:**

1. Your team member makes a change to a schema in EventCatalog (inside your events, queries or commands folders)
1. The action will review the schema for breaking changes using your configured LLM (OpenAI, Anthropic, Google)
1. The action will return a summary of changes, and give you a score of how likely the changes are to be breaking
1. The action will list affected consumers so you know who’s impacted
1. Your team member is still in control of the merge decision, but now has the information to make a more informed decision

#### Setup

:::info EventCatalog Scale License
The GitHub action requires an EventCatalog Scale License. 
You can get a 14 day free trial from [EventCatalog Cloud](https://eventcatalog.dev/cloud).
:::

Set your EventCatalog Scale License key in the `license_key` parameter. We recommend storing the `license_key` value as a GitHub secret.

To use the EventCatalog GitHub Action, create a new .github/workflows/eventcatalog-ci.yaml file in your repository with the following content:

```yaml title=".github/workflows/eventcatalog-ci.yaml"
name: EventCatalog CI
on:
  push:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]
  delete:
permissions:
  contents: read
  pull-requests: write
jobs:
  schema_review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: event-catalog/github-action@main
        with:
          # The task to run, currently only schema_review is supported
          task: schema_review
          # The AI LLM provider to use (openai, anthropic, google)
          provider: openai

          # The model to use for the task, defaults to o4-mini
          # Find the models in the documentation below
          model: o4-mini

          # Your API KEY for the LLM provider
          api_key: ${{ secrets.OPENAI_API_KEY }}
          
          # Your EventCatalog Scale License key
          license_key: ${{ secrets.EVENT_CATALOG_LICENSE_KEY }}

          # Your GitHub token
          github_token: ${{ secrets.GITHUB_TOKEN }}

```

#### Configuration options

<!-- Table with configuration options -->

| Parameter | Description | Required | Default |
|-----------|-------------|----------|---------|
| `task` | The task to run, currently only `schema_review` is supported | Yes | N/A |
| `catalog_directory` | The directory where the EventCatalog files are located. Useful for monorepos. By default, the action will review all files in the repository. If you have EventCatalog in a subdirectory, you can specify the directory here. | No | `./` |
| `failure_threshold` | The score below which the action will fail. The score is a number between 0 and 100. The default is 25. The LLM will return a score between 0 and 100, based on the likelihood of the changes being breaking. | No | 25 |
| `provider` | The AI LLM provider to use (openai, anthropic, google) | Yes | openai |
| `model` | The model to use for the task, defaults to `o4-mini`. See the list of supported models: [OpenAI models](https://github.com/event-catalog/github-action/blob/bf92166b4e4c9414caf63e88bc7a315467b506b6/src/ai-models/openai.ts#L4), [Anthropic models](https://github.com/event-catalog/github-action/blob/bf92166b4e4c9414caf63e88bc7a315467b506b6/src/ai-models/anthropic.ts#L4), [Google models](https://github.com/event-catalog/github-action/blob/bf92166b4e4c9414caf63e88bc7a315467b506b6/src/ai-models/google.ts#L4) |Yes | o4-mini |
| `api_key` | Your API KEY for the LLM provider | Yes | N/A |
| `license_key` | Your EventCatalog Scale License key | Yes | N/A |

#### Got an issue?

If you have any issues with the GitHub action, please [open an issue](https://github.com/event-catalog/github-action) on the GitHub action repository.