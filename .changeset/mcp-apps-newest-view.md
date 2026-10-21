---
'@eventcatalog/core': patch
---

fix(core): bring the MCP App views in line with the latest MCP Apps guidance. Only one view in a conversation updates the model's context (the newest, or the one last used), canvases in chats sync rarely while they're out of sight and less often while nothing changes, full screen views keep clear of the host's safe areas on phones, the views ask hosts not to frame them, and results no longer set ChatGPT's `openai/widgetSessionId` (it's the host's own)
