---
"@eventcatalog/visualiser": patch
"@eventcatalog/core": patch
---

Mermaid exports of domain and system diagrams keep their boundaries and levels. Domains, subdomains, systems and a flow's lanes are subgraphs (styled apart), edges between domains are highlighted, and the visualiser's Mermaid view, the `.mermaid` routes, AI Chat and the MCP server share one exporter. Levels 1 and 2 of domain and system diagrams are served at `/visualiser/{domains|systems}/{id}/{version}/{overview|services}.mermaid`, and the architecture diagram tools accept `detail: "services"` for level 2.

The visualiser's Mermaid view now looks and works like the diagram: the same title and menu, dotted background and toolbar (fit, zoom and the L1/L2/L3 levels, which switch the Mermaid diagram and keep you in the Mermaid view). Zooming is smoother (proportional to the trackpad or wheel, around the cursor, as on the diagram), and switching levels draws each diagram once and fades it in rather than jumping.

The diagram menu's "Export image" is now "Export", which asks whether to download the diagram as an image or as a Mermaid (`.mmd`) file (in the Mermaid view, the image is of the Mermaid diagram). In Mermaid, channels are drawn as parallelograms rather than cylinders, which read as databases.

Entity diagrams export to Mermaid as entity relationship diagrams (`erDiagram`): each entity with its properties (its identifier as PK, references as FK), relationships with their cardinality (has one, has many, belongs to), entities from other domains named with their domain, and aggregate roots highlighted.

The diagram's toolbar has a "Render as Mermaid" toggle after its levels (on in the Mermaid view, to go back). The Mermaid view is kept in the URL (`?render=mermaid`), as the level is in `?level=`, so links open in it. Exported images have "Made with EventCatalog · eventcatalog.dev" in a strip under the diagram, as Studio's do (whose badge now sits under the canvas rather than over it). The Share and Export modals open centred on the diagram rather than the page, without jumping as they open, and leaving the Mermaid view fits the diagram to the view.
