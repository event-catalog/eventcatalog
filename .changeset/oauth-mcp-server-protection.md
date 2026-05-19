---
'@eventcatalog/core': minor
---

feat(core): add OAuth Bearer token authentication for the built-in MCP server. EventCatalog now acts as an MCP protected resource server and can require valid access tokens (JWT) on `/docs/mcp`, with protected resource metadata served at `/.well-known/oauth-protected-resource`.
