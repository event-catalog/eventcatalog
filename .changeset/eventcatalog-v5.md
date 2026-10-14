---
'@eventcatalog/core': major
'@eventcatalog/visualiser': major
---

EventCatalog v5: new visualiser diagrams with levels.

Diagrams are now laid out with ELK instead of dagre. Edges are routed at right angles around nodes, each with its own connection point so they no longer run on top of each other, and edge labels sit on their edge. Nested groups (subdomains and systems in a domain) are laid out in one pass, and relayouts in the browser load ELK on demand.

Every diagram uses the same three levels, shown as L1, L2 and L3 in the canvas toolbar (and `?level=1|2|3` in the URL): L1 for domains, systems and their relationships, L2 for services and data stores, and L3 adding messages and channels. Domain and system pages have a single Diagram page with all three levels.

Breaking changes:

- Domain and system diagrams live at `/visualiser/domains/:id/:version` and `/visualiser/systems/:id/:version`, with levels. The domain System Diagram (`/systems-context`), the system Context Diagram (`/context`) and the service Data Dependency Graph (`/data`) pages now redirect to the matching level. The old domain and system Resource Diagram pages are replaced by the Diagram page.
- Sidebar links are renamed: "System Diagram", "Resource Diagram" and "Context Diagram" become "Diagram", "Map" becomes "Diagram", "Entity Map" becomes "Entity Diagram" and "System Context Map" becomes "System Context Diagram". The "Data Dependency Graph" link is removed.
- `?level=` values follow the new levels (`1` overview, `2` services and data stores, `3` messages and channels).
- Diagrams are laid out differently, so layouts saved in dev mode for old Resource Diagrams don't carry over to the new pages.
- `@eventcatalog/visualiser`: `layoutGraph` now returns a promise, the dagre helpers (`createDagreGraph`, `layoutDagreGraph`, `getNodesAndEdgesFromDagre`, `calculatedNodes`) are removed, and edges are drawn along the route in `data.route` when there is one. A new `@eventcatalog/visualiser/layout` entry (no React) exports `layoutWithElk`, `getNodeSize`, `hideMessageNodes`, `hideNodes`, `getMessagesLabel`, `isCarrier` and `isMessageNode`.
