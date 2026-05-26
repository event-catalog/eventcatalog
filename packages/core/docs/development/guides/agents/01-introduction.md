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

<AddedIn version="3.41.0" />

In EventCatalog, agents represent AI-powered components in your architecture. They sit alongside services, messages, domains, and flows as first-class catalog resources.

An agent typically wraps a large language model (LLM) and is given access to tools (MCP servers, APIs, databases) so it can take autonomous or semi-autonomous actions.

![Agent detail page showing model, tools, and connected messages](./img/agent-documentation.png)

## Why document agents?

As AI agents take on real responsibilities in production systems they become part of your architecture whether or not they are documented.

Cataloging them gives your team:

- **Discoverability** — engineers and stakeholders can find what agents exist, what they do, and who owns them.
- **Model governance** — the `model` block captures which provider, model, and snapshot version the agent runs on so drift is visible in the catalog.
- **Tool transparency** — the `tools` array lists every external capability (MCP server, API, database) the agent can reach.

## Where agents live in your architecture

Agents can belong to a domain or subdomain, or sit at the root of your catalog alongside services. They participate in flows as first-class steps and appear in search, the sidebar, and the discover page.

![Agent rendered as a node in the EventCatalog visualiser, connected to its tools and messages](./img/agent-visualizer.png)

## Finding agents in your catalog

Agents appear in the discover page alongside services, messages, domains, and flows. You can search, filter, and browse them the same way you would any other resource.

![Explore page listing agents in the catalog with their owners and domains](./img/explore-agents.png)
