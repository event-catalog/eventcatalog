---
sidebar_position: 1
keywords:
- MCP Server
sidebar_label: Introduction
title: MCP server
description: Connect AI tools to your architecture catalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';

import PlanBanner from '@site/src/components/MDX/PlanBanner';

<PlanBanner plan="Scale" />

EventCatalog exposes a built-in MCP server that lets AI agents and other MCP clients query your architecture catalog. Its
built-in tools can find resources, inspect schemas and ownership, follow message producers and consumers, and analyze change
impact.

You can connect a client to the whole catalog, or limit it to the graph of a particular domain or system. Scoped connections
give an agent the selected resource and resources recursively reachable through its supported relationships, without exposing
unrelated parts of the catalog.

On a domain or system page, select **Connect to MCP server** to copy the appropriate scoped server URL. EventCatalog uses the
unversioned URL for the latest resource version and includes the version when you are viewing historical documentation.




