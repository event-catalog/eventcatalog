---
"@eventcatalog/core": patch
---

fix(embed): hide catalog chrome and fill the viewport when embedding pages

- Hide the vertical nav, header and resource sidebar on any page rendered with `?embed=true`
- Give the visualiser, architecture graph, system context map, schema explorer, schema detail and discover pages a full-height embedded viewport (CSS driven, replacing the old post-load inline height scripts)
- Support `?theme=light` / `?theme=dark` alongside `embed=true` so an embed can pick its own theme without overwriting the user's saved catalog preference
