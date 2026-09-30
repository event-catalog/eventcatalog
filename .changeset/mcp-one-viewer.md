---
'@eventcatalog/core': patch
---

feat(core): show MCP architecture diagrams and schemas in one viewer that opens full screen

`showResource` shows architecture diagrams and schemas in one MCP App view. Its results carry an `openai/widgetSessionId`, so ChatGPT keeps one viewer open and switches it to each diagram or schema instead of showing another. The view asks hosts to open it full screen (`openai/ui` `preferredDisplayMode`) and declares the display modes it supports.
