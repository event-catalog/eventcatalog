---
'@eventcatalog/visualiser': minor
'@eventcatalog/core': minor
---

Add a floating canvas toolbar to the visualiser with levels of detail, simulate messages, minimap and fit to view. The levels are the same on every diagram: L1 for domains, systems and their relationships, L2 for services and data stores, and L3 adding messages and channels. Levels a diagram doesn't have are greyed out (e.g. L1 on a service's diagram). The level is kept in the URL (`?level=2` / `?level=3`) so shared links open at the same level. Adds a "Hide messages" option to the canvas menu, makes the toolbar follow the catalog theme colour, and removes the "Open in EventCatalog Studio" menu item. Clicking a legend entry now hides (or shows again) those nodes rather than highlighting them, re-laying out the graph with an animation and fading the entry while hidden; hidden messages and channels keep the nodes either side connected. Nodes leaving the graph when switching levels now fade out. The level is remembered for each kind of diagram (e.g. services and flows separately), legend entries hidden stay hidden when switching levels, and diagrams levels don't apply to (e.g. entity maps) don't show them.
