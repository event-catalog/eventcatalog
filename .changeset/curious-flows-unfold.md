---
"@eventcatalog/core": minor
"@eventcatalog/visualiser": minor
---

Sub-flow references inside a flow can now be expanded inline. Clicking a sub-flow node in the visualiser inlines the referenced flow's steps in place (mirroring the message-group expand/collapse pattern), with the Collapse button in the header restoring the single-node view. Expanded sub-flow children participate in the business-flow walkthrough, and the graph recentres via `fitView` on both expand and collapse.
