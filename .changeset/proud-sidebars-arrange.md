---
"@eventcatalog/core": minor
---

feat(core): customize any resource's sidebar with a `sidebar.json` file

Drop a `sidebar.json` next to any resource's `index.mdx` (domains, systems, services, agents, messages, flows, containers, entities, data products and ADRs) to fully define that resource's sidebar. Compose predefined `$sections` (kept live as your catalog changes) with your own groups of resource references (`[[service|order-service]]`), documentation (`[[doc|guides/onboarding]]`), specifications (`[[spec|openapi.yml]]`), schemas (`[[schema|order-placed]]`) and links (with `{id}`/`{version}`/`{collection}` placeholders). Groups nest, accept an explicit `collapsed` initial state, and versioned resources inherit the resource folder's sidebar. Unresolvable tokens and doc/spec/schema references fail the build with an error naming the file and the valid options.

The sidebar also renders as a consistent docs-style tree: every group is collapsible with carets on the right, nested groups indent under a guide line, item counts are removed, the selected item stays in view after navigation, and scroll position is remembered.
