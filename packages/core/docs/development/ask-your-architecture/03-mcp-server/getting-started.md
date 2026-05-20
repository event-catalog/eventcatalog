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

### Protect with OAuth

<AddedIn version="3.40.0" />

The built-in MCP server can be protected with OAuth Bearer tokens, following the MCP authorization specification for HTTP transports.

EventCatalog acts as the OAuth protected resource server for `/docs/mcp`. Your identity provider or authorization server remains responsible for user login, consent, client registration, `/authorize`, `/oauth/token`, and token refresh.

Configure MCP authorization in `eventcatalog.config.js`:

```js title="eventcatalog.config.js"
module.exports = {
  output: 'server',
  mcp: {
    auth: {
      enabled: true,
      resource: 'https://your-eventcatalog.com/docs/mcp',
      authorizationServers: ['https://auth.example.com'],
      issuer: 'https://auth.example.com',
      audience: 'https://your-eventcatalog.com/docs/mcp',
      requiredScopes: ['catalog:read'],
      jwksUri: 'https://auth.example.com/.well-known/jwks.json',
    },
  },
};
```

When enabled, EventCatalog serves protected resource metadata at `/.well-known/oauth-protected-resource`. Unauthenticated MCP clients receive a `401 Unauthorized` response with a `WWW-Authenticate` header pointing at that document. MCP clients then obtain an access token from the advertised authorization server and call `/docs/mcp` with:

```http
Authorization: Bearer <access-token>
```

The access token must be valid, unexpired, issued by the configured issuer, intended for the configured audience, and include all required scopes.

#### Key signing options

Choose one of the following strategies for token validation:

| Strategy | Config fields |
|---|---|
| JWKS endpoint (recommended) | `jwksUri` |
| Inline asymmetric public key | `publicKey` or `publicKeyEnvVar` |
| Symmetric shared secret | `sharedSecret` or `sharedSecretEnvVar` |

Prefer `publicKeyEnvVar` or `sharedSecretEnvVar` over inline values to avoid committing secrets to source control.

#### All options

| Field | Required | Description |
|---|---|---|
| `enabled` | Yes | Enables OAuth Bearer token validation |
| `resource` | No | Absolute URL of the MCP resource. Set this explicitly when behind a proxy |
| `protectedResourceMetadataUrl` | No | URL for the protected resource metadata document. Defaults to `/.well-known/oauth-protected-resource` |
| `authorizationServers` | No | Authorization server URLs advertised to MCP clients |
| `issuer` | No | Expected token issuer (`iss` claim) |
| `audience` | No | Expected token audience (`aud` claim). Defaults to `resource` |
| `requiredScopes` | No | Scopes every token must include |
| `jwksUri` | No | JWKS endpoint for asymmetric JWT validation |
| `publicKey` | No | Inline public key for asymmetric JWT validation |
| `publicKeyEnvVar` | No | Environment variable containing the public key |
| `sharedSecret` | No | Inline shared secret for symmetric JWT validation |
| `sharedSecretEnvVar` | No | Environment variable containing the shared secret |

:::note Existing website authentication
The `auth.enabled` and `eventcatalog.auth.js` settings protect the EventCatalog website with browser sessions. MCP authorization is separate because MCP clients authenticate with Bearer tokens, not browser cookies.
:::

:::tip Authorization server discovery
EventCatalog serves `/.well-known/oauth-protected-resource` for MCP client discovery. It does not serve `/.well-known/oauth-authorization-server`, `/authorize`, or `/oauth/token` -- those endpoints must be provided by the authorization server listed in `authorizationServers`. If your MCP client expects those endpoints on the catalog host, proxy the authorization server behind that host with your load balancer or reverse proxy.
:::

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





