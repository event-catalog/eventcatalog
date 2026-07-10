---
sidebar_position: 2
keywords:
- EventCatalog agents
- AI agents
- creating agents
sidebar_label: Create an agent
title: Create an agent
description: Creating and managing agents within EventCatalog.
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PromptBox from '@site/src/components/MDX/PromptBox';
import ProjectTree from '@site/src/components/MDX/ProjectTree';

Agents document AI-powered capabilities in your architecture. Use them for assistants, autonomous workers, copilots, review agents, or any LLM-backed component that can reason over data, call tools, receive messages, or send messages.

You can also add [model metadata](/docs/development/guides/resources/agents/model-metadata), [tools](/docs/development/guides/resources/agents/adding-tools), [messages](/docs/development/guides/resources/agents/add-messages-to-agents), and [data stores](/docs/development/guides/resources/agents/add-data-stores-to-agents) to your agents.

![Example](./img/agent-documentation.png)

## Adding a new agent

### Automatic Creation

<PromptBox preview="Create a new EventCatalog agent">
Read https://www.eventcatalog.dev/docs/development/guides/resources/agents/create-agent.md and https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/agents.md then help me create a new EventCatalog agent in my catalog.

Ask me for the agent name, what the agent does, summary, model provider/name/version if known, tools it can call, messages it receives or sends, data stores it reads from or writes to, and whether it belongs at the root of the catalog or inside a domain. Then create the correct agents/{'{Agent Name}'}/index.mdx or domains/{'{Domain Name}'}/agents/{'{Agent Name}'}/index.mdx file with frontmatter and starter markdown, you can add as much markdown as you want that captures the users input.

If the catalog does not have any domains, put it into the root agents folder.

You can use MDX components found here https://raw.githubusercontent.com/event-catalog/skills/refs/heads/main/skills/catalog-documentation-creator/references/components.md
</PromptBox>

Copy this prompt and paste it into your coding agent. Your agent can help you choose where the agent should live, create the right folder structure, and add the first version of the agent documentation.

### Manual Creation

Agents can live at the root of your catalog or inside a domain.

Create a new folder for the agent with an `index.mdx` file.

<ProjectTree
  items={[
    {
      name: 'agents',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'FraudReviewAgent',
          type: 'folder',
          defaultOpen: true,
          children: [{ name: 'index.mdx', highlight: true }],
        },
      ],
    },
  ]}
/>

If the agent belongs to a domain, keep it inside that domain:

<ProjectTree
  items={[
    {
      name: 'domains',
      type: 'folder',
      defaultOpen: true,
      children: [
        {
          name: 'Payments',
          type: 'folder',
          defaultOpen: true,
          children: [
            {
              name: 'agents',
              type: 'folder',
              defaultOpen: true,
              children: [
                {
                  name: 'FraudReviewAgent',
                  type: 'folder',
                  defaultOpen: true,
                  children: [{ name: 'index.mdx', highlight: true }],
                },
              ],
            },
          ],
        },
      ],
    },
  ]}
/>

You can also place agents inside a subdomain when the agent belongs to a more specific business boundary.

## Create the agent file

Create an `index.mdx` file for the agent.

_Here is an example of what an agent markdown file may look like._

```md title="/agents/FraudReviewAgent/index.mdx (example)"
---
# id of your agent, used for slugs and references in EventCatalog.
id: FraudReviewAgent

# Display name of the Agent, rendered in EventCatalog
name: Fraud Review Agent

# Version of the Agent
version: 0.0.1

# Short summary of your Agent
summary: |
  Reviews risky payments, explains fraud signals, and recommends whether payment processing should continue.

# Optional owners, references teams or users
owners:
    - dboyne

# Optional model metadata describing the LLM this agent runs on
model:
  provider: OpenAI
  name: gpt-4.1
  version: "2025-04-14"

# Optional external tools the agent can call
tools:
  - name: Risk profile lookup
    type: mcp
    icon: /icons/tools/datadog.svg
    url: https://mcp.example.com/fraud/risk-profile
    description: Retrieves transaction anomaly, device fingerprint, and fraud model signals.

# Optional messages this agent receives and its version
receives:
  - id: PaymentInitiated
    version: 0.0.1

# Optional messages this agent sends and its version
sends:
  - id: FraudReviewCompleted
    version: 0.0.1

# Optional data stores this agent reads from
readsFrom:
  - id: fraud-analytics-db
    version: 0.0.1

# Optional badges, rendered to UI by EventCatalog
badges:
    - content: AI Agent
      backgroundColor: purple
      textColor: purple
---

## Overview

The Fraud Review Agent reviews risky payment attempts before they continue through the payment gateway.

<NodeGraph />

## Tools

<AgentTools />
```

## Attaching an agent to a domain

To associate an agent with a domain, add its `id` to the `agents` array in the domain's frontmatter:

```md title="/domains/Payment/index.mdx (example)"
---
id: Payment
name: Payment Domain
version: 0.0.1
agents:
  - id: FraudReviewAgent
    version: 0.0.1
services:
  - id: PaymentService
    version: 0.0.1
---
```

EventCatalog will show the agent in the domain sidebar and include it in the domain visualiser.
