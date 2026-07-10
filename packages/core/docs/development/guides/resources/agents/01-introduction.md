---
sidebar_position: 1
keywords:
- EventCatalog agents
- AI agents
- LLM agents
- agent documentation
sidebar_label: What are agents?
title: Understanding agents
description: Document and govern AI agents alongside your services and events.
---

import AddedIn from '@site/src/components/MDX/AddedIn';

In EventCatalog, agents represent AI-powered components in your architecture. They sit alongside services, messages, domains, and flows as first-class catalog resources.

An agent typically wraps a large language model (LLM) and is given access to tools (MCP servers, APIs, databases) so it can take autonomous or semi-autonomous actions.

### Why document agents?

As AI agents take on real responsibilities in production systems they become part of your architecture whether or not they are documented.

Cataloging them gives your team:

- **Discoverability** — engineers and stakeholders can find what agents exist, what they do, and who owns them.
- **Model governance** — the `model` block captures which provider, model, and snapshot version the agent runs on so drift is visible in the catalog.
- **Tool transparency** — the `tools` array lists every external capability (MCP server, API, database) the agent can reach.

