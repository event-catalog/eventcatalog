---
"@eventcatalog/core": patch
"@eventcatalog/sdk": patch
---

Add the `eventcatalog federate` CLI command. Reads `federation.sources` from the catalog config, fetches and indexes each configured GitHub source, resolves the combined graph, then hydrates federated content and public assets into the local catalog. Includes a content-addressed cache (`--no-cache` to bypass), pinned source commits in a lockfile, and ownership conflict reporting.
