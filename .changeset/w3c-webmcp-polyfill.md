---
'@eventcatalog/core': patch
---

fix(core): Studio uses the W3C WebMCP polyfill (`@w3c/webmcp-polyfill`) in place of `@mcp-b/webmcp-polyfill`. It doesn't watch the page for changes, so Studio now offers its canvas tools to agents in the browser straight away, with nothing to turn on in Connect agent
