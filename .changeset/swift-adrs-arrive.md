---
"@eventcatalog/core": minor
---

feat(core): add Architecture Decision Records (ADRs) as a first-class resource

ADRs are now a versioned resource type with their own collection, discover page, sidebar section, and relationships (supersedes/amends/related). ADRs can link to other resources via `appliesTo`, and linked ADRs surface on the resource sidebar under "Decision Records". Includes new example ADRs in the default catalog.
