---
"@eventcatalog/core": patch
---

fix(core): bundle the WebMCP relay's browser files instead of installing `@mcp-b/webmcp-local-relay`

Studio serves the relay's three browser files so a canvas can hand its tools to desktop MCP clients. They're now part of EventCatalog (copied from the relay 5.1.0, MIT), so installing EventCatalog no longer installs the relay's Node dependencies, which pinned vulnerable versions of `@modelcontextprotocol/core` (SNYK-JS-MODELCONTEXTPROTOCOLCORE-20579858) and `zod`.
