---
'@eventcatalog/visualiser': minor
'@eventcatalog/core': minor
---

feat: clicking a node on a diagram shows its card, in place of focus mode: what it is and which domain or system it's in, its name, version and summary, what it's connected to, with each resource's icon (a message's producers and consumers, through its channels and the channels they route to, what a service sends and receives, and what a channel carries, who produces and consumes it and where it routes: click one to go to it; long groups show the first few until opened, and the list scrolls under the card's header), and links to open its diagram and its docs. It's Studio's node card, so a node reads the same on a diagram and on a canvas. Domain and system boxes show theirs from their header, cmd/ctrl-click opens a node's diagram in a new tab, and picking a node in search moves the diagram to it and shows its card. Flow diagrams and entity maps are unchanged. The visualiser's `NodeGraph` takes a `getNodeDiagramUrl` prop for the diagram a node's card opens; `FocusModeModal` is removed, and `linksToVisualiser` no longer does anything
