---
'@eventcatalog/visualiser': patch
'@eventcatalog/core': patch
---

feat(visualiser): Studio's hotspots are easier to work through. The list at the bottom left shows one row each, as the assistant lists the hotspots it flags, goes to a hotspot when you click or rest on it, and stays open. Markers on the canvas are just their severity's icon (with how many, when there's more than one), and an opened hotspot reads more clearly. The right-click menu is in groups (writing, the clipboard, adding, deleting), with Cut, Paste and a note's colour, and "Edit text" on notes and text. An opened hotspot opens beside its marker, pointing at it, and stays there as the canvas zooms. A hotspot being added can be dragged somewhere else with its form open, an open hotspot is deleted with Delete or Backspace, the hotspot tool's pointer is a faded marker, and deleting a node (by people or agents) deletes the hotspots on it (undo brings them back) rather than leaving them where it was. On an empty canvas, the hint to drag resources in points at the palette's tabs when it's folded away
