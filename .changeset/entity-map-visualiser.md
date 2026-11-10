---
'@eventcatalog/visualiser': minor
---

feat(visualiser): entity maps can be grouped with the "Group by" picker, by the domain, system or team each entity belongs to (`data.lanes`, as flows use). Entities show a ring when selected, like the other nodes, and picking an entity in search moves the diagram to it and selects it. Entities are laid out at the size they render, a row for each property, so they no longer overlap.

Fixes search results opening under the "Group by" picker.
