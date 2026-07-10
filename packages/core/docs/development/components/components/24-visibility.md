---
sidebar_position: 24
keywords:
  - components
  - visibility
  - agents
  - ai
  - llm
sidebar_label: Visibility
title: Visibility
description: Gate content by audience — humans in the UI, agents in raw markdown
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.33.0" />

`<Visibility>` lets you write a single MDX file that serves two audiences: human readers in the browser and AI agents or LLMs consuming raw markdown. Wrap content in the appropriate block and EventCatalog handles the rest — no content forking required.

**Example**

```jsx /queries/GetInventoryList/index.mdx
<Visibility for="humans">
  Use the **Schema** and **Visualiser** actions on this page to inspect the
  inventory query contract and its relationships.
</Visibility>

<Visibility for="agents">
  When reasoning about this query, treat `GET /inventory` as a read-only
  inventory lookup. Prefer linking this query to inventory reporting, order
  placement, and stock reservation workflows.
</Visibility>
```

### How it works

In the browser UI, only `for="humans"` blocks render. The `for="agents"` block returns nothing and is never visible to human readers.

When an AI agent or LLM fetches the raw markdown for a resource — via the `.md` / `.mdx` endpoints, the `/llms-full.txt` feed, custom docs, team/user pages, language pages, or diagram pages — the `for="humans"` blocks are stripped and only `for="agents"` content remains.

This means the same file can give a human reader UI-oriented guidance ("click the Schema tab") while giving an agent structured, machine-actionable context ("treat this as a read-only lookup") without any duplication.

### Props

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| `for` | `"agents"` \| `"humans"` | Yes | The target audience for the wrapped content. |

### Write effective agent content

Use `for="agents"` blocks to provide context that helps AI tools reason about your architecture. Good agent content includes:

- The intent and constraints of the resource ("read-only", "idempotent", "fires on every state change")
- How the resource relates to other services or workflows
- Edge cases or business rules that are not obvious from the schema

Use `for="humans"` blocks for UI-oriented guidance: links to tabs, interactive tools, visual walkthroughs, or anything that only makes sense in a browser context.

### Support

`<Visibility>` is supported in domains, services, all messages, changelogs, custom documentation pages, team pages, user pages, language pages, and diagram pages.
