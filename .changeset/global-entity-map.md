---
'@eventcatalog/core': minor
---

feat(core): add the Global Entity Map, a diagram of every entity in the catalog and how they relate across domains, at `/visualiser/entity-map` (Top level diagrams in the visualiser). Entities are placed in the domain that owns them, including entities listed by a system or a service, and an entity more than one domain lists goes in a "Shared across domains" group. Entities can be grouped by domain, system or team, and a collapsible panel shows or hides each domain, or only the references that cross domains. What's shown is kept in the URL, so a view can be shared.

The example catalog has new entities listed by systems and services (Ledger Entry, Tracking Event, Return Request, Loyalty Account, Points Transaction, Campaign, Offer) and a Currency shared by Payments and Catalog.

Fixes the Architecture Graph page having more space below the graph than above and beside it.
