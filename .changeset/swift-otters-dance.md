---
'@eventcatalog/core': patch
'@eventcatalog/visualiser': patch
---

Improve `<Flow />` and `<NodeGraph />` MDX embeds: support boolean MDX props for `search`, `legend`, and `walkthrough`; avoid duplicate page node graph when a `<Flow />` or `<NodeGraph />` is already embedded; use unique portal IDs per flow embed; render a compact NodeGraph menu button when no title is provided.
