---
'@eventcatalog/core': patch
---

fix(core): custom pages using `@catalog/layouts/Layout.astro` now get the same page padding and theme text color as built-in pages, so content is readable in dark mode. Pass `fullWidth` to the layout to render content edge-to-edge.
