---
sidebar_position: 3
keywords:
- mermaid
sidebar_label: schemas.txt
title: schemas.txt
description: Understanding how to use schemas.txt with EventCatalog and your schemas
---

import AddedIn from '@site/src/components/MDX/AddedIn';

<AddedIn version="2.64.0" />

Enable tools like Claude, ChatGPT, GitHub Copilot, and Cursor to quickly fetch and understand your EventCatalog schemas.

Message schemas and service specifications can be fetched from your EventCatalog and used in your own applications.

### What is schemas.txt?

Schemas.txt is very similar to [LLMS.txt](/docs/development/developer-tools/llms.txt), but it is specifically for schemas in your EventCatalog. 

Schemas.txt supports any schema format for your messages (e.g Avro, Protobuf, JSON Schema etc) and any specification for your services (e.g OpenAPI, AsyncAPI, GraphQL etc).

The schemas.txt file is automatically generated and maintained as part of your documentation pipeline, requiring no manual configuration. It organizes your schemas in a format optimized for machine reading.

### schemas.txt and schemas-full.txt

The `schemas.txt` file includes your EventCatalog schemas in a simple format. Lists your schemas with a summary for each of them.

### How to use schemas.txt?

The [EventCatalog MCP](/docs/development/ask-your-architecture/mcp-server/introduction) already uses the schemas.txt file to provide access to your schemas in your MCP clients (e.g Cursor, Windsurf, Claude Desktop etc).

If you want to use schemas.txt in your own application, you can query the urls:

 - `https://<your-catalog-url>/docs/llm/schemas.txt`
    - Demo: https://demo.eventcatalog.dev/docs/llm/schemas.txt





