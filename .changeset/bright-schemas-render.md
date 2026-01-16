---
"@eventcatalog/core": patch
---

fix(schema-viewer): add support for oneOf and anyOf JSON Schema keywords

- Add handling for `anyOf` in processSchema function (was missing entirely)
- Fix `oneOf` rendering to show selected variant's properties instead of merged properties
- Add variant selector UI for nested `oneOf`/`anyOf` within properties
- Add support for `oneOf`/`anyOf` in array items
- Show variant type indicator ("anyOf" or "oneOf") in property type display

Fixes #1965
