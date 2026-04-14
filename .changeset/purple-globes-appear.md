---
"@eventcatalog/core": minor
"@eventcatalog/sdk": minor
"@eventcatalog/visualiser": minor
---

feat: add `externalSystem` flag to services for modelling third-party integrations

Services can now set `externalSystem: true` in their frontmatter to be rendered as external systems. This changes their presentation without changing their capabilities — they still send and receive messages, have owners, and support specifications like any other service.

- Visualiser: external services render purple with a Globe icon and an "External System" badge
- Sidebar (root): a dedicated "External Systems" section lists externals; the regular "Services" section excludes them
- Sidebar (domain): externals appear under a new "External Integrations" group, separate from "Services In Domain"
- Per-service nav badge reads "External System" instead of "Service"
- `/discover`: a new "External Systems" tab alongside the "Services" tab
- SDK: the `Service` type now accepts `externalSystem?: boolean`
