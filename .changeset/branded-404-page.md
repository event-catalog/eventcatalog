---
'@eventcatalog/core': patch
---

feat(core): add a 404 page. Static builds now write `dist/404.html`, which hosts such as Netlify, GitHub Pages and Cloudflare Pages serve for missing paths, and in server mode it answers unmatched routes and unknown resources or versions. It's a page of its own in the catalog's theme and logo, shows the path that wasn't found, links home and to the catalog's resources, and when the link was to a resource that's still in the catalog (e.g. a version that has been removed) it links to that resource's latest version.
