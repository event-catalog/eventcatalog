---
'@eventcatalog/core': patch
'@eventcatalog/visualiser': patch
---

feat(core): draw on a Studio canvas with the assistant. "Draw with AI" opens the assistant on the canvas, which draws there live with the catalog's configured model (the same tools agents use over MCP, faster), follows it while it works and tidies the canvas when it's done. It can add a domain or system with everything in it (`contents`) or a resource with what it connects to (`connections`), flag hotspots, write sticky notes and text kept clear of nodes, take you to nodes, walk you through how something works step by step, and reference what's on the canvas so hovering or clicking takes you there. MCP and WebMCP agents' `addToCanvas` gets `contents`, `connections`, notes and text (`fontSize`), and `getCanvas` lists hotspots. `eventcatalog.chat.js` can pass the model provider's options (`configuration.providerOptions`). The assistant shows what it's doing as it works. Sticky notes are written smaller, from their top left.
