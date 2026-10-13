---
"@eventcatalog/core": patch
---

fix(core): keep `eventcatalog dev` and `eventcatalog preview` running when an AI agent runs them

Astro 7 starts its dev and preview servers in the background when it detects an AI agent. The command exited as soon as the server was up, left the server running after the CLI stopped, and hid errors such as a port already in use behind "process exited before becoming ready". EventCatalog now keeps the server in the foreground, as it does in a terminal.
