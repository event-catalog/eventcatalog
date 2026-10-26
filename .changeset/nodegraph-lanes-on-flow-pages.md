---
'@eventcatalog/core': patch
---

fix(core): `<NodeGraph lanes="…" />` on a flow's page now opens the flow grouped, as `<Flow lanes="…" />` does. The page dropped the `lanes` prop, so the flow was shown ungrouped.
