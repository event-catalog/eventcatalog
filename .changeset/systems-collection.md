---
"@eventcatalog/core": minor
---

Add support for a new `systems` collection. Systems are a versioned resource that can be defined in any folder (including inside domains), rendered as documentation pages, and listed in the sidebar with their own icon and color. Systems can group services and flows, be visualised as an architecture map, and be targeted by architecture decision records (`appliesTo: [{ type: 'system' }]`).
