---
"@eventcatalog/visualiser": patch
"@eventcatalog/core": patch
---

Edges in the visualiser and Studio land on their nodes again. Nodes often render shorter than the layout estimates, so edge ends sat below the node (and missed its handle); they now keep where the layout spread them along a node's side, measured from the node's middle as it renders. Diagrams opened in Studio keep the heights their nodes were laid out at, so their edges land the same way.
