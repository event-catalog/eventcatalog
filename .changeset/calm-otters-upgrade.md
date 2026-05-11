---
'@eventcatalog/core': minor
---

Upgrade Astro and related integrations to the latest 6.3.x line (astro 6.3.1, @astrojs/check 0.9.9, @astrojs/markdown-remark 7.1.1, @astrojs/mdx 5.0.4, @astrojs/node 10.1.0, @astrojs/react 5.0.4). Align `@types/react` / `@types/react-dom` on v19 so type-checking works across the workspace. Replace `getEntry('customPages', …)` with a cached `getCollection` lookup in the custom-documentation nav builder to avoid Astro's noisy `slug` deprecation accessor firing thousands of times per build.
