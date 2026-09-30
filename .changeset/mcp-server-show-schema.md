---
'@eventcatalog/core': minor
---

Add a `showSchema` tool to the MCP server. It shows the user the schema of a message (or other resource with a schema) with the same viewer as the Schema Explorer: in MCP clients that support MCP Apps (e.g. Claude, ChatGPT, VS Code), a Schema tab with the highlighted source and a Properties tab for JSON Schema, Avro and Protobuf, which the user can search and expand. Messages with several schemas can switch between them. Other clients get the schema code. The server's instructions now point models at `showSchema`, rather than `getSchemaForResource`, when the user wants to see a schema.
