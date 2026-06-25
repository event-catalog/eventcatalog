---
"@eventcatalog/core": minor
---

Add support for a new `systems` collection. Systems are a versioned resource that can be defined in any folder (including inside domains), rendered as documentation pages, and listed in the sidebar with their own icon and color. Systems can group services, flows, and entities, be visualised as an architecture map, be browsed and filtered on a dedicated discover page (`/discover/systems`), and be targeted by architecture decision records (`appliesTo: [{ type: 'system' }]`). Domains can reference one or more systems, which are listed in the domain sidebar and merged into the domain's architecture map (each referenced system's services are grouped within the domain graph, like subdomains). Teams and users can own systems, which are surfaced on their profile pages.
