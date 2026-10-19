---
'@eventcatalog/core': minor
---

chore: the MCP server moves to the MCP TypeScript SDK 2 (`@modelcontextprotocol/server` and `client` 2.3.1, `@modelcontextprotocol/ext-apps` 2.0.3). Clients connect as before (protocol 2025-11-25), and MCP Apps work in the same hosts. Custom tools in `eventcatalog.chat.js` keep working with zod 3 and the AI SDK's `jsonSchema()` (which couldn't be used before), and one whose schema can't be read is skipped with a warning instead of failing the MCP server. Tool icons use the SDK's own support. The SDK needs Node.js 20 or later. Calling a tool that doesn't exist now returns a JSON-RPC error (`-32602`) instead of a tool error result
