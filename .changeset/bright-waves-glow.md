---
"@eventcatalog/visualiser": patch
---

Scope all visualiser CSS under `.eventcatalog-visualizer` so the package is fully self-contained. Fixes broken styles when installed from npm by including Tailwind utilities in the scoped output. Portals now render inside the scoped container (or document.body for full-screen modals) so styles apply correctly. Dark mode background and focus mode modal z-index fixes included.
