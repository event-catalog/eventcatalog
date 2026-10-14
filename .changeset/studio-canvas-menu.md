---
'@eventcatalog/core': patch
'@eventcatalog/visualiser': patch
---

feat(core): Studio's canvas menu (top left) and its bar at the top right now look like the visualiser's menu at the top left of a diagram: the same button, title, menu icon and menu items, from styles the visualiser exports (`DIAGRAM_MENU_*`) and uses itself. The people list at the top right is no longer shown (with its divider) when you're signed in and nobody else is on the canvas.
