---
sidebar_position: 2
keywords:
- MCP Server
sidebar_label: Installation
title: Getting started
description: Connect MCP clients to your EventCatalog
---

import AddedIn from '@site/src/components/MDX/AddedIn';
import PlanBanner from '@site/src/components/MDX/PlanBanner';

<PlanBanner plan="Scale" />

### Prerequisites

1. **SSR mode** - EventCatalog must run in [server mode](/docs/development/deployment/build-ssr-mode#building-your-eventcatalog-ssr) (not static)
2. **Scale license** - You can get a 14 day free trial at [eventcatalog.cloud](https://eventcatalog.cloud)

### Quick start

Your MCP server is available at:

```
https://your-eventcatalog.com/docs/mcp/
```

For local development:

```
http://localhost:3000/docs/mcp/
```

### Verify the server

Visit the endpoint in your browser to verify. It returns available tools and resources:

```json
{
  "name": "EventCatalog MCP Server",
  "version": "1.0.0",
  "status": "running",
  "tools": ["getResources", "getResource", ...],
  "resources": ["eventcatalog://all", "eventcatalog://events", ...]
}
```

### Connect clients

<details>
<summary>Claude Desktop</summary>
1. Get your MCP URL `https://your-eventcatalog.com/docs/mcp/`
1. Navigate to the [Connectors](https://claude.ai/settings/connectors) page in Claude Settings.
1. Select **Add custom connector**
1. Select **Add**
5. When using Claude, select the attachments button (the plus icon).
6. Select your MCP server.
</details>

<details>
<summary>Claude Code</summary>
1. Get your MCP URL `https://your-eventcatalog.com/docs/mcp/`
2. Run the command to connect claude code to your eventcatalog instance
```bash
claude mcp add --transport http <name> <url>
```
</details>

<details>
<summary>Cursor</summary>
1. Get your MCP URL `https://your-eventcatalog.com/docs/mcp/`
1. Use `Command` + `Shift` + `P` (`Ctrl` + `Shift` + `P` on Windows) to open the Command Palette.
1. Search for "Open MCP settings"
1. Select **Add custom MCP.** This opens the `mcp.json` file.
1. Add the following to the `mcp.json` file:
```json
{
  "servers": {
    "<your-mcp-server-name>": {
      "url": "https://your-eventcatalog.com/docs/mcp/"
    }
  }
}
```
</details>

<details>
<summary>VS Code</summary>
1. Get your MCP URL `https://your-eventcatalog.com/docs/mcp/`
1. Create a `.vscode/mcp.json` file.
1. Inside the `mcp.json` file, add the following:
```json
{
  "servers": {
    "<your-mcp-server-name>": {
      "type": "http",
      "url": "https://your-eventcatalog.com/docs/mcp/"
    }
  }
}
```
</details>

## Available tools

### 15 built-in tools

- `getResources` - Get events, services, commands, queries, flows, domains
- `getResource` - Get a specific resource by id and version
- `getMessagesProducedOrConsumedByResource` - Messages a resource sends/receives
- `getSchemaForResource` - Get OpenAPI, AsyncAPI, or other schemas
- `findResourcesByOwner` - Resources owned by a team or user
- `getProducersOfMessage` - Services that produce a message
- `getConsumersOfMessage` - Services that consume a message
- `analyzeChangeImpact` - Impact of changing a message
- `explainBusinessFlow` - Detailed flow information
- `getTeams` / `getTeam` - Query teams
- `getUsers` / `getUser` - Query users
- `findMessageBySchemaId` - Find messages by schema identifiers
- `explainUbiquitousLanguageTerms` - DDD ubiquitous language from domains

[See full API documentation →](/docs/development/ask-your-architecture/mcp-server/getting-started)

### 12 resources

- `eventcatalog://all` - All resources
- `eventcatalog://events` - All events
- `eventcatalog://commands` - All commands
- `eventcatalog://queries` - All queries
- `eventcatalog://services` - All services
- `eventcatalog://channels` - All channels
- `eventcatalog://diagrams` - All diagrams
- `eventcatalog://containers` - All containers
- `eventcatalog://domains` - All domains
- `eventcatalog://flows` - All flows
- `eventcatalog://teams` - All teams
- `eventcatalog://users` - All users

## Add custom tools

Extend the MCP server with custom tools in `eventcatalog.chat.js`:

```javascript
// eventcatalog.chat.js
export const tools = {
  myCustomTool: {
    description: 'My custom tool for EventCatalog',
    parameters: z.object({
      query: z.string().describe('The query parameter'),
    }),
    execute: async ({ query }) => {
      // Your custom logic here
      return { result: 'Custom data' };
    },
  },
};
```

Custom tools appear alongside built-in tools automatically.

## Use standalone server

For catalogs without SSR mode, use the standalone `@eventcatalog/mcp-server` package. We plan to deprecate this in a future release, so we recommend migrating to the built-in server when possible.

<details>
<summary>Standalone server on stdio</summary>

For local development and testing, you can use the MCP Server on stdio. This is useful for single-client, low-latency tools.

**Prerequisites:**
- EventCatalog configured with the [`LLMS.txt` feature](/docs/development/developer-tools/llms.txt)
- EventCatalog Scale license
- MCP client installed

**Command:**

```bash
npx -y @eventcatalog/mcp-server {URL_TO_YOUR_EVENTCATALOG_INSTANCE} {EVENTCATALOG_LICENSE_KEY}
```

</details>

<details>
<summary>Standalone server over HTTP</summary>

Run the MCP Server over HTTP for production deployments.

**Prerequisites:**
- EventCatalog instance running
- EventCatalog Scale license
- MCP client installed

**Run using npx:**

```bash
npx -y @eventcatalog/mcp-server https://your-eventcatalog-instance.com {EVENTCATALOG_LICENSE_KEY} http {PORT} {ROOT_PATH}
```

**Example:**

```bash
npx -y @eventcatalog/mcp-server https://demo.eventcatalog.dev {EVENTCATALOG_LICENSE_KEY} http 3000 /mcp
```

This starts the MCP Server over HTTP on port 3000 with root path `/mcp`.

**Run using Docker:**

See [instructions on the GitHub repository](https://github.com/event-catalog/mcp-server/blob/main/README.Docker.md).

</details>





