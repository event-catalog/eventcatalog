---
"@eventcatalog/core": minor
"@eventcatalog/sdk": minor
---

feat: add field-level usage tracking for message consumers

Services and domains can now declare which specific fields they depend on in their `receives` (and `sends`) pointers using an optional `fields` array. When declared, a new Field Usage page appears in the message sidebar showing all schema properties alongside their consumers. Supports JSON Schema, Avro, and Protobuf schemas. Includes detection of fields declared by consumers that don't exist in the schema.
