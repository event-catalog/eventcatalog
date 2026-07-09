---
'@eventcatalog/core': patch
---

fix(core): builds failing with `TypeError: Missing parameter: id` when `trailingSlash: true` is set

Astro 7.0.4 (withastro/astro PR #17224) changed route patterns for dynamic file
endpoints (e.g. `/docs/teams/[id].md`) to never accept a trailing slash, but the
prerender path generator still appends one when `trailingSlash: 'always'` is
configured. The generated path (`/docs/teams/customer-platform.md/`) no longer
matches the route pattern, so static builds crash. A Vite plugin now patches
Astro's param extraction to retry with the trailing slash flipped when no route
pattern matches — a no-op on unaffected Astro versions and once the regression
is fixed upstream.
