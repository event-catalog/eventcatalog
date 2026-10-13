---
'@eventcatalog/core': patch
---

`eventcatalog dev` starts faster and the first page no longer reloads itself:

- Pre-bundled dependencies are reused between starts. The order Astro listed packages in changed from one start to the next, so Vite treated every start as a config change and re-bundled all of them.
- The first page loads once instead of up to three times. Astro's startup content write no longer reloads it, and the view-transition modules are pre-bundled instead of being found on the first page.
- The startup prewarm now renders the homepage. It requested `127.0.0.1` while the dev server can listen on IPv6 only, and stopped at `/ping`, so it never reached the homepage.
