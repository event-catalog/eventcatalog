---
"@eventcatalog/linter": minor
---

Validate ADRs (Architecture Decision Records). The linter now scans `**/adrs/*/index.{md,mdx}` and validates their frontmatter against a schema mirroring the EventCatalog content collection — including the `status` enum (`proposed`, `accepted`, `rejected`, `deprecated`, `superseded`). Previously invalid ADR frontmatter (e.g. an unknown `status`) passed the linter but failed `eventcatalog build` with `InvalidContentEntryDataError`. ADRs are exempt from the `owner-required` best practice since they declare ownership via `decisionMakers`.
