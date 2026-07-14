---
"@eventcatalog/core": minor
"@eventcatalog/sdk": minor
"@eventcatalog/visualiser": minor
---

Allow services, domains, and agents to document messages triggered by any received message and show both sides of those relationships in message sidebars and node graphs. Messages with documented trigger relationships include a dedicated Trigger paths page with one visual row per path and its optional scenarios; messages without paths do not generate the page. The SDK supports trigger pointers and includes domains when resolving message producers and consumers. Message, service, and data store visualizers now keep the currently viewed resource visibly marked as the graph's focus, and resource context menus can focus another node in its own map. Edge labels now render above graph edges so intersecting paths do not obscure their text.
