---
"@eventcatalog/core": patch
---

Resolve JSON Schema `$ref` pointers (local and remote) when rendering remote JSON schemas, so referenced definitions are inlined instead of shown as unresolved `$ref` values.
