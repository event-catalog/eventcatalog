---
'@eventcatalog/core': patch
---

fix(core): show `additionalProperties` in the JSON Schema viewer. Typed maps show as `map<string, Value>` and can be expanded to their value schema, including inside arrays and `oneOf`/`anyOf` options, and closed objects (`additionalProperties: false`) say that additional properties are not allowed. Schemas that refer to themselves through a `$ref` no longer crash the viewer: the repeated reference is marked as circular
