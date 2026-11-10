---
'@eventcatalog/core': patch
---

fix(core): upgrade the WebMCP polyfill to 6.0.3 and the WebMCP local relay to 6.0.3, removing a vulnerable `@modelcontextprotocol/server` (SNYK-JS-MODELCONTEXTPROTOCOLSERVER-21756799). Desktop agents using the relay should run `npx -y @mcp-b/webmcp-local-relay@6.0.3`
