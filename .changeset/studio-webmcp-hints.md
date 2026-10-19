---
'@eventcatalog/core': patch
---

fix(core): Studio's WebMCP tools follow Chrome's annotation rules: `show_nodes` is no longer marked read only (it changes the user's selection and view), and `get_canvas` is marked as returning untrusted content (names, notes and comments come from people)
