---
"@eventcatalog/core": minor
---

Add RFC 9727 `.well-known/api-catalog` endpoint that publishes a machine-readable Linkset of services, domains, their specifications (OpenAPI, AsyncAPI, GraphQL), and the EventCatalog MCP server when enabled. Raw specifications are served from `/.well-known/api-catalog/specifications/{collection}/{id}/{version}/{specification}`.
