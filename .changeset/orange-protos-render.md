---
"@eventcatalog/core": minor
---

feat(core): add Protobuf support to SchemaViewer and Schema Explorer

The `<SchemaViewer />` MDX component and the Schema Explorer now render
structured views for Protocol Buffers (`.proto`) schemas, like JSON Schema
and Avro. Includes a dependency-free proto2/proto3 parser that captures
doc comments, nested messages, enums, maps, and oneofs. Also fixes the
Schema Explorer filter panel not collapsing when filters are active.
