---
'@eventcatalog/visualiser': patch
---

feat(visualiser): every node's colours are Radix's scales (the palette Vercel's Geist colours are built on) in place of Tailwind's: events orange, services pink, commands and data stores blue, queries green, channels a neutral gray, actors and domains amber, external systems purple, data products indigo, views cyan, and the rest likewise, shade for shade. The legend, the minimap, the handles' glow, the node search's type icons, group nodes and Studio's node icons (and their lighter dark-theme shades) and team node match, and version and summary text on events is neutral grey. Custom nodes' colour palettes (their `color`) move to Radix too, each keeping its own scale (slate and gray, amber and yellow stay distinct). Colours set with `styles.node.color` and layouts are unchanged
