---
'@eventcatalog/linter': patch
---

Stop `structure/unrecognised-file` reporting usage examples in a message's `examples/` folder (events, commands and queries, including versioned ones). They're loaded by EventCatalog as examples, not resources.
