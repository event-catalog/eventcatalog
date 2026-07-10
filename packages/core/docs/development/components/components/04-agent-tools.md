---
sidebar_position: 4
keywords:
- components
- agents
- agent tools
sidebar_label: AgentTools
title: AgentTools
description: Component for displaying the tools an agent can call in EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="3.41.0" />

The `<AgentTools/>` component renders a table of the tools an agent can call (MCP servers, REST APIs, internal search indexes, databases, and so on).

The component reads the `tools` array from the current agent's frontmatter, so it requires no props.

### Use case

- Display all the external capabilities an agent reaches out to at runtime.
- Show MCP server endpoints, REST APIs, and other integrations on the agent page.

**Basic Example**

```jsx /agents/OrderSupportAgent/index.mdx
<AgentTools />
```

### Output

![Example output](./img/agent-tools.png)

### Props

The `<AgentTools/>` component takes no props — it reads the `tools` array from the current agent's frontmatter.

For details on the `tools` frontmatter shape, see [Agent tools](/docs/development/guides/resources/agents/adding-tools).

### Support

The `<AgentTools/>` component is supported in agent pages only. If you add it to a service, message, or domain page, the catalog will display a warning and skip the table.
