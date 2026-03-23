---
"@eventcatalog/core": patch
---

Fix SSR crash on schema/fields page by adding @xyflow/react to vite.ssr.noExternal so Vite handles CSS imports during SSR
