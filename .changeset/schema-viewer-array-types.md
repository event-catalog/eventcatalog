---
"@eventcatalog/core": patch
---

fix: render JSON Schema array-valued `type` correctly in `SchemaViewer`. Types declared as arrays (e.g. `["object", "null"]`) now display as `object | null` instead of `objectnull`, and nested properties/array items are still traversable when the type is a union.
