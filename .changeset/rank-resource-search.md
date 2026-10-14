---
'@eventcatalog/core': patch
---

Rank resource search results by how well they match: an exact name first, then names that start with or contain the query, then id matches, then summary-only matches. Summary-only matches no longer appear above, or push out, resources whose name matches.
