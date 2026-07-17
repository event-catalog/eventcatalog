---
keywords:
- EventCatalog agents
- Agent frontmatter
sidebar_position: 11
sidebar_label: Reference
title: Agents reference
description: Frontmatter fields, paths, and routes for agents in EventCatalog.
---

This page lists the fields, paths, and routes supported by agents.

## Paths

Agents can be created in any `agents` folder:

```txt
/agents/{Agent Name}/index.mdx
/domains/{Domain Name}/agents/{Agent Name}/index.mdx
```

Versioned agents use:

```txt
/agents/{Agent Name}/versioned/{version}/index.mdx
```

## Routes

| Route | Description |
|-------|-------------|
| `/docs/agents/{agent-id}/{version}` | Agent documentation page. |
| `/visualiser/agents/{agent-id}/{version}` | Agent resource diagram. |

## Required fields

### `id` {#id}

- Type: `string`

Unique id of the agent. EventCatalog uses this for URLs and resource references.

```md title="Example"
---
id: customer-support-agent
---
```

### `name` {#name}

- Type: `string`

Display name of the agent.

```md title="Example"
---
name: Customer Support Agent
---
```

### `version` {#version}

- Type: `string`

Version of the agent documentation.

```md title="Example"
---
version: 1.0.0
---
```

## Optional fields

### `summary` {#summary}

- Type: `string`

Short description of what the agent does.

```md title="Example"
---
summary: Answers customer support questions using catalog and order context.
---
```

### `owners` {#owners}

- Type: `array`

An array of team or user ids that own the agent.

```md title="Example"
---
owners:
  - support-platform
---
```

### `model` {#model}

- Type: `object`

Model metadata for the agent.

```md title="Example"
---
model:
  provider: OpenAI
  name: gpt-4.1-mini
  version: "2025-04-14"
---
```

### `tools` {#tools}

- Type: `array`

Tools the agent can use.

```md title="Example"
---
tools:
  - name: Order lookup
    type: mcp
    url: https://mcp.example.com/orders
    description: Retrieves order status and recent order events.
---
```

### `sends` {#sends}

- Type: `array`

Messages the agent sends.

```md title="Example"
---
sends:
  - id: SupportCaseCreated
    version: 1.0.0
---
```

### `receives` {#receives}

- Type: `array`

Messages the agent receives.

```md title="Example"
---
receives:
  - id: CustomerQuestionAsked
    version: 1.0.0
---
```

### `readsFrom` {#readsFrom}

- Type: `array`

Data stores the agent reads from.

```md title="Example"
---
readsFrom:
  - id: support-knowledge-base
    version: 1.0.0
---
```

### `writesTo` {#writesTo}

- Type: `array`

Data stores the agent writes to.

```md title="Example"
---
writesTo:
  - id: support-case-store
    version: 1.0.0
---
```


### `badges` {#badges}

- Type: `array`

Badges rendered on the agent page.

```md title="Example"
---
badges:
  - content: AI
    backgroundColor: purple
    textColor: purple
---
```

### `repository` {#repository}

- Type: `object`

Repository metadata for the agent.

```md title="Example"
---
repository:
  language: TypeScript
  url: https://github.com/acme/support-agent
---
```

## Model fields

```md
---
model:
  provider: OpenAI
  name: gpt-4.1-mini
  version: "2025-04-14"
---
```

## Tool fields

```md
---
tools:
  - name: Order lookup
    type: mcp
    url: https://mcp.example.com/orders
    description: Retrieves order status and recent order events.
---
```

## Custom properties

You can add organization-specific metadata to this resource using frontmatter fields prefixed with `x-`. Learn how to define, render, and reference them in [Custom properties on resources](/docs/development/customization/custom-properties).
