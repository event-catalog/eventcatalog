---
'@eventcatalog/core': minor
---

feat(core): collaborative canvases (experimental, dev server only). People and AI agents design together on a live canvas in EventCatalog Studio (`/studio`, with an icon in the sidebar, replacing the page that linked to the hosted Studio app): drag in components and catalog resources (domains and systems as cards or containers), connect them, comment, and switch between L1, L2 and L3 like the visualiser. Agents join over the MCP server (canvas tools and an MCP App for ChatGPT and Claude) or WebMCP in the browser (turned on from "Connect agent" in browsers without WebMCP of their own), and work on the canvas like a person, with their own pointer. Canvases are kept in memory and are off when authentication is enabled.
