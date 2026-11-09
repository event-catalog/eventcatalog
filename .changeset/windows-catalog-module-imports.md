---
'@eventcatalog/core': patch
---

fix(core): load eventcatalog.auth.js, eventcatalog.chat.js, middleware.ts and local generators on Windows. They were imported by their path, which Node's module loader doesn't accept on Windows (ERR_UNSUPPORTED_ESM_URL_SCHEME): sign-in and custom access rules were silently off, and the assistant and custom MCP tools didn't load. A failure to load eventcatalog.auth.js is now logged.
